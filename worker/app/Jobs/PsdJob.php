<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;

use GuzzleHttp\Client as GuzzleClient;
use Intervention\Image\ImageManager as InterventionImageManager;

class PsdJob implements ShouldQueue
{
	use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

	private $load, $baseDir;

	/**
	 * Create a new job instance.
	 *
	 * @return void
	 */
	public function __construct($data)
	{
		if ( isset($data->demo) ) {
			$this->load = $this->getDemoLoad();
		} else {
			$this->load = $data;
		}
		// @TODO: download material files here, cuz it's faster and parallel
	}

	/**
	 * Execute the job.
	 *
	 * @return void
	 */
	public function handle()
	{
		sleep(1); // prevent jam
		// $this->waitForPsInWindowsTaskList(); // this is slow...
		$jobId = $this->job->getJobId();
		echo("Job ID: $jobId\n");

		$load = $this->load;
		$this->setConfigs();
		// if ( isset($this->getJob()->psd) ) {
		// 	$this->handleError(501);
		// 	return false;
		// }
		$this->downloadFile( $this->load->psd_url, $this->psdDir . "\\$jobId.psd" );
		$load->psd = "$jobId.psd";
		$this->writeJobFile($jobId, $load);
		$this->execPsdjs($jobId . ' get_visible_top_layers_indexes'); // get topmost visible indexes
		\Log::info("job $jobId execJsx");
		$this->execJsx($jobId);
		// check \out\result.json
		if ( file_exists($this->outDir . "\\$jobId\\topmost.psd") ) {
			$this->execPsdjs($jobId . ' get_visible_top_layers_info'); // get layer info
		}
		\Log::info("job $jobId cropPNGs");
		$this->cropPNGs($jobId);
		$this->moveFilesToPublic($jobId);
		$jobResult = $this->prepareResult($jobId);
		file_put_contents($this->publicDir . '\\' . $jobId . '\\result.json', json_encode($jobResult));
		\Log::info("job $jobId callback " . $load->callback_url);
		$cbRe = $this->callback($jobResult, $load->callback_url);
		\Log::info("job $jobId callback re $cbRe");

	}

	public function handleError($errorId)
	{
		echo "\n[ Err ] $errorId \n";
	}

	public function setConfigs()
	{   // Defining Pathes
		$bd = "C:\\ca";
		$this->baseDir    = $bd;
		$this->jobDir     = $bd . "\\job";
		$this->psdDir     = $bd . "\\psd";
		$this->outDir     = $bd . "\\out";
		$this->psdJsDir   = $bd . "\\psdjs\\psd.js";
		$this->sharpJsDir = $bd . "\\sharpjs\\sharp.js";
		$this->vbsDir     = $bd . "\\runner.vbs";
		$this->publicDir  = "C:\\xampp\\htdocs\\q\\public\\psdjob";
		$this->remoteBase = "http://localhost/q/public/psdjob";
	}

	public function downloadFile($remoteUrl, $localDir)
	{
		$file = file_get_contents($remoteUrl);
		return file_put_contents($localDir, $file);
	}

	public function execPsdjs($argument)
	{
		$psdJsDir = $this->psdJsDir;
		$psdJsCmd = "node $psdJsDir $argument";
		return exec($psdJsCmd);
	}

	public function execJsx($argument)
	{
		$cmd = "cscript \"$this->vbsDir\" $argument";
		// exec($cmd . " > mytxt.txt"); 
		// exec('start "" ' . $cmd); 
		// pclose(popen($cmd, "r")); 
		if (isset($non_block_exec))
			echo $cmd = "start \"\"". $cmd . " > mytxt.txt";
		exec($cmd); 
	}

	public function cropPNGs($jobId)
	{
		$job = $this->readJobFile($jobId);
		if (!isset($job->visible_top_layers_indexes) ||
		    !isset($job->visible_top_layers_info)) {
			return false;
		}
		$imanager = new InterventionImageManager(array('driver' => 'gd'));
		list($docw, $doch) = getimagesize($this->outDir . "\\$jobId\\" . $job->visible_top_layers_indexes[0] . ".png"); 
		$job->layer_position = new \stdClass;
		foreach ($job->visible_top_layers_indexes as $layerIndex) {
			$li = $job->visible_top_layers_info->{$layerIndex};
			$pngDir = $this->outDir . "\\$jobId\\$layerIndex.png";

			$l = $li->left;  	$t = $li->top; 
			$w = $li->width; 	$h = $li->height;
			list($cropX, $cropW) = $this->calcIntersect($l, $w, $docw);
			list($cropY, $cropH) = $this->calcIntersect($t, $h, $doch);

			$job->layer_position->{$layerIndex} = 
				['top'=>$cropY, 'left'=>$cropX, 'width'=>$cropW, 'height'=>$cropH];
			if ($cropW == 0 || $cropH == 0) continue;

			$arg = "$pngDir $cropX $cropY $cropW $cropH";
			$this->execSharpCrop($arg);
			// $img = $imanager->make($pngDir);
			// $img->crop($li->width, $li->height, $li->left, $li->top);
			// $img->save();
		}
		$this->writeJobFile($jobId, $job);
		// echo var_dump($job);
	}

	public function calcIntersect($offset, $select, $pivot)
	{
		if ($offset >= $pivot) // fully out right
			return [0, 0];

		if ($offset >= 0 && $offset + $select < $pivot) // fully inside
			return [$offset, $select];

		if ($offset >= 0 && $offset + $select >= $pivot) // right overflow
			return [$offset, $pivot - $offset];

		// so now we have: $offset < 0 

		if ($offset + $select <= 0) // fully out left
			return [0, 0];

		if ($offset + $select <= $pivot) // left overflow
			return [0, $offset + $select];

		// select is superset of pivot
		return [0, $pivot];
	}

	public function execSharpCrop($argument)
	{
		$sharpJsDir = $this->sharpJsDir;
		$psdJsCmd = "node $sharpJsDir $argument";
		echo "\n$psdJsCmd\n";
		return exec($psdJsCmd);
	}

	public function callback($jobResult, $callback_url)
	{
		$result = ['ok'=>true, 'result'=>$jobResult];
		$client = new GuzzleClient;
		$res = $client->post( $callback_url,  ['json' => $result] );
		return $res->getBody()->getContents();
	}

	public function readJobFile($jobId)
	{
		$jobJson = file_get_contents($this->jobDir . "\\$jobId.json");
		return json_decode($jobJson);
	}

	public function writeJobFile($jobId, $load)
	{
		$jobJson = json_encode($load);
		return file_put_contents($this->jobDir . "\\$jobId.json", $jobJson);
	}

	public function waitForPsInWindowsTaskList()
	{
		while (true) {
			exec("tasklist 2>NUL", $win_task_list);
			$engine_not_found = true;
			foreach ($win_task_list as $win_task) {
				if (strpos($win_task, 'Photoshop.exe') !== false) {
					$engine_not_found = false;
					break;
				}
			}
			if ($engine_not_found) {
				echo('Engine not running... wait 10 seconds');
				sleep(10);
			} else {
				echo("Engine is running.\n");
				return;
			}
		}
	}

	public function prepareResult($jobId)
	{
		$job = $this->readJobFile($jobId);
		$re = [
			'ok'=>true,
			'doc_width'  => $job->psd_info->cols,
			'doc_height' => $job->psd_info->rows,
			'layers' 	 => []
		];
		foreach ($job->visible_top_layers_indexes as $layerIndex) {
			$inf = $job->full_psd_info->{$layerIndex};
			$pos = $job->layer_position->{$layerIndex};
			$layer = [
				'visible' 	=> $inf->visible,
				'opacity' 	=> $inf->opacity,
				'name' 		=> $inf->name,
				'blending' 	=> $inf->blendingMode,
				'top' 		=> $pos->top,
				'left' 		=> $pos->left,
				// 'right' 	=> $inf->right,
				// 'bottom' 	=> $inf->bottom,
				'height' 	=> $pos->height,
				'width' 	=> $pos->width,
				'imageurl' => $this->remoteBase . "/$jobId/$layerIndex.png"
			];
			if (isset($inf->text)) {
				$it =  $inf->text;
				$itf = (isset($it->font))?$it->font:null;
				$layer['text'] = [
					'value' => $it->value,
					'font'	=> ( (isset($itf->name))?$itf->name:'Arial' ),
					'size'	=> ( (isset($itf->sizes[0]))?$itf->sizes[0]:24 ),
					'color'	=> [],
					'align'	=> ( (isset($itf->alignment[0]))?$itf->alignment[0]:'left'),
					'txx'	=> $it->transform->xx,
					'txy'	=> $it->transform->xy,
					'tyx'	=> $it->transform->yx,
					'tyy'	=> $it->transform->yy,
					'ttx'	=> $it->transform->tx,
					'tty'	=> $it->transform->ty
				];
				// Correct the f*kin reverse align in RTL and DIR absence in psd data
				if ( $layer['text']['align'] == 'left')
					$layer['text']['align'] = 'right';
				elseif ( $layer['text']['align'] == 'right')
					$layer['text']['align'] = 'left';
				$layer['text']['color'] = [
					'r'=> (isset($itf->colors[0][0]))?$itf->colors[0][0]:0,
					'g'=> (isset($itf->colors[0][1]))?$itf->colors[0][1]:0,
					'b'=> (isset($itf->colors[0][2]))?$itf->colors[0][2]:0
				];
			}
			$re['layers'][] = $layer;
		}
		return $re;
	}

	public function moveFilesToPublic($jobId)
	{
		$outJ = $this->outDir . '\\' . $jobId;
		$pubJ = $this->publicDir . '\\' . $jobId;
		$pngFiles = array_diff(scandir($outJ), array('.', '..', 'topmost.psd'));
		mkdir($pubJ);
		foreach ($pngFiles as $pngFile) {
			copy("$outJ\\$pngFile", "$pubJ\\$pngFile");
		}
	}

	public function getDemoLoad()
	{
		$load = new \stdClass;
		$load->psd_url = "http://localhost/demopsd.psd";
		$load->callback_url = "http://localhost/";
		return $load;
	}
}
