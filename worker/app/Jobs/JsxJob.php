<?php

namespace App\Jobs;

use App\JobDetail;
use Dotenv\Loader;
use GuzzleHttp\Client as GuzzleClient;
use Illuminate\Bus\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;

class JsxJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    private $load, $baseDir;
    private $vbsDir = 'JSX/vbs.vbs';

    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct($load)
    {
        $this->load = $load;
    }

    public function beforeDispatch() {
        $inputsDir = $this->load->config->dirInputs;
        foreach ($this->load->recipe->inputs as $fileName) {
            if (file_exists("$inputsDir/$fileName")) continue;
            $fileUrl = $this->load->recipe->baseUrl . '/' . $fileName;
            $fileContents = @file_get_contents($fileUrl);
            if ($fileContents === false) {
                throw new \Exception('Transloading error');
            }
            file_put_contents("$inputsDir/$fileName", $fileContents);
        } 
    }

    public function afterDispatch($jobId)
    {
        $jobDetail = new JobDetail;
        $jobDetail->job_id = $jobId;
        $jobDetail->status = 'dispatched';
        $jobDetail->input = json_encode($this->load);
        $jobDetail->save();
        $outputs = [];
        foreach ($this->load->recipe->outputs as $outputIndex => &$output) {
            $baseName = explode('.', $this->load->recipe->base)[0];
            $fileName = "$baseName-$jobId-$outputIndex.$output->type";
            $output->fileName = $fileName;
            $outputs[] = $fileName;
        }
        $jobDetail->input = json_encode($this->load);
        $jobDetail->output = json_encode(['outputs'=>$outputs]);
        $jobDetail->status = 'downloaded';
        $jobDetail->save();
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        $jobId = $this->job->getJobId();
		echo("Started Job ID: $jobId\n");
		$baseApiUrl = 'http://127.0.0.1:8031/api/jsx';
        $this->execJsx("$baseApiUrl $jobId");
        $this->afterHandle($jobId);
    }

    public function execJsx($argument)
	{
        $vbsDir =  realpath($this->vbsDir);
		$cmd = "cscript \"$vbsDir\" $argument 2>&1";
		// if (isset($non_block_exec))
		//  $cmd = "start \"\"". $cmd . " > mytxt.txt";
        // $res = shell_exec($cmd);
        $res = [];
        exec($cmd, $res, $status);
        $res = implode("\n", $res);
		echo("$cmd :: $status\n$res");
        \Log::info("$cmd :: $status\n$res");
    }
    
    protected function afterHandle($jobId) {
        $jobDetail = JobDetail::where('job_id', $jobId)->firstOrFail();
        try {
            $jobDetail->output = json_decode($jobDetail->output);
            $jobDetail->baseUrl = 'http://127.0.0.1:8031/jobs/outputs/';
            $callback = json_decode($jobDetail->input)->recipe->callback;
            $client = new GuzzleClient;
            $res = $client->post( $callback,  ['json' => $jobDetail] );
            \Log::info("cb :: " . $res->getBody()->getContents());
        } catch (\Exception $e) {
            
        }
    }


}
