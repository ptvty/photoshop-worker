<?php

namespace App\Http\Controllers;

use App\Models\Mock;
use App\Models\Task;

use Illuminate\Http\Request;
use GuzzleHttp\Client as GuzzleClient;

class TaskController extends Controller
{

    protected $modelClass = \App\Models\Task::class;
    protected $qServerJsxUrl = 'http://127.0.0.1:8031/api/jsx';
    protected $publicFileDir = '/api/files/';

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
		if ($request->view == 'zip') {
			return $this->zipTaskFiles(explode(',', $request->id), $request->uuid);
		
		}
		$tenant = $request->tenant;
		$uuid   = $request->uuid;
        $models = $this->modelClass::orderBy('id', 'asc')
			->where('tenant', $tenant)
			->where('task_uuid', $uuid)
			->with('mock')
			->with('artwork')
			->get();
		foreach ($models as $model) {
			$model->title = $model->mock->title . ' + ' . $model->artwork->title;
			$mockThumb = $model->mock->data_json['thumb_dir'] ?? null;
			$mockThumb = (null != $mockThumb) ? url('download/'.$mockThumb) : null;
			$model->thumb_url = $mockThumb;
			$taskJobDone = (null !== $model->data);
			$taskOutput = $model->data['outputs'][0] ?? null;
			$model->status = (null != $taskOutput) ? 'done' : 'proccessing';
			$model->status = ($taskJobDone && null == $taskOutput) ? 'error' : $model->status;
			$model->thumb_url = (null == $taskOutput) ? $model->thumb_url : url('download/'.$taskOutput);
		}
        return response()->json(['result'=>$models]);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
    }
	
	static public function uuid($data = null){
		$data = $data ?? random_bytes(16);
		assert(strlen($data) == 16);

		$data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
		$data[8] = chr(ord($data[8]) & 0x3f | 0x80); // set bits 6-7 to 10

		return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));	
	}

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
		$tenant = $request->tenant;
		$requestTask = json_decode($request->getContent());
		$replacement = $requestTask->replacement ?? null;
		$uuid = TaskController::uuid();
		$records = [];
		foreach ($requestTask->mocks ?? [] as $mockId) {
			foreach ($requestTask->artworks ?? [] as $artworkId) {
				$records[] = [
					'mock_id' => $mockId,
					'artwork_id' => $artworkId,
					'tenant' => $tenant,
					'task_uuid' => $uuid,
					'replacement' => $replacement
				];
			}
		}
		Task::insert($records);
		$tasks = $this->proccessTasks($uuid);
		return response()->json($uuid);
    }

    protected function proccessTasks($taskUuid) {
		$tasks = Task::where('task_uuid', $taskUuid)->get();
		foreach ($tasks as $task) {
			$this->proccessTask($task);
		}
		return $tasks;
	}

    protected function proccessTask($task) {
        $mock = $task->mock;
        $artwork = $task->artwork;
        $mockMeta = $mock->data_json;
        $mockToLayerAddress = $mockMeta['smart_layers'][$mockMeta['default_smart_layer']]['address'];
        $baseFileUrl = url($this->publicFileDir);
        $callbackUrl = route('taskQueueCallback', ['taskJobId'=>$task->id]);
        $qJobRes = $this->sendSmartReplaceJobToQserver(
			$baseFileUrl, 
			$mock->file_path, 
            $artwork->file_path, 
			$mockToLayerAddress, 
			$task->replacement,
			$callbackUrl);
        $task->q_job_id = $qJobRes->job_id;
        $task->save();
    }

    protected function sendSmartReplaceJobToQserver($baseUrl, $baseFileName, $inputFileName, $toLayer, $resizeMode, $callbackUrl) {
        $qserver_api_url_jsx = $this->qServerJsxUrl . '/new-job';
        $jobLoad = [
            'baseUrl' => $baseUrl,
            'inputs'  => [$baseFileName, $inputFileName],
            'base'    => $baseFileName,
            'tasks'   => [ [
                'type'=>'smart_replace_resized', 
                'from'=>$inputFileName, 
                'to'=>$toLayer, 
                'resizeMode'=>$resizeMode
                ] ],
            'outputs' => [ ['type'=>'jpg'] ],
            'callback' => $callbackUrl,
        ];
        $client = new GuzzleClient;
        $res = $client->post( $qserver_api_url_jsx,  ['json' => $jobLoad, 'timeout' => 50.0] );
        return json_decode($res->getBody()->getContents());
    }


    /**
     * Display the specified resource.
     *
     * @param  \App\Models\MockTask  $mockTask
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
		$tenant = $request->tenant;
        $task = Task::findOrFail($id);
		if ($task->tenant != $tenant) abort(403);
        $task->load('mock');
        $task->load('artwork');
        return response()->json($task);
    }
	
	public function zipTaskFiles($ids, $uuid) {
		$files = [];
		$tasks = Task::whereIn('id', $ids)->where('task_uuid', $uuid)->get();
		foreach ($tasks as $job) {
			if ( isset($job->data) && isset($job->data['outputs']) && is_array($job->data['outputs']) )
				foreach ($job->data['outputs'] as $output) 				
					$files[] = realpath('download/' . $output);
		}
		//var_dump($files);
		//die();
		$zip = new \ZipArchive;
		$zippath = realpath("download") . "/$uuid.zip";

		if ($zip->open($zippath, \ZipArchive::CREATE) === TRUE)
		{
			// Add files to the zip file
			foreach ($files as $file) {
				$zip->addFile($file, basename($file));
			}

			// All files are added, so close the zip file.
			$zip->close();
		}
		return redirect(url("download/$uuid.zip"));
	}

    public function queueCallback($taskJobId, Request $request) {
        $callbackPayload = json_decode($request->getContent());
        $jobOutput = $callbackPayload->output;
        $outputFileName = $jobOutput->outputs[0];
        $this->transload("$callbackPayload->baseUrl/$outputFileName", "download/$outputFileName");
        $taskJob = Task::find($taskJobId);
        $taskJob->data = $jobOutput;
        $taskJob->save();
        return ['ok'=>true];
    }

    protected function transload($from, $to)
    {
        $fileContent = file_get_contents($from);
        file_put_contents($to, $fileContent);
    }

}
