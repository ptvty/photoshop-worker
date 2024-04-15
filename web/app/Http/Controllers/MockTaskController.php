<?php

namespace App\Http\Controllers;

use App\Models\Mock;
use App\Models\MockTask;
use App\Models\MockTaskJob;
use Illuminate\Http\Request;
use GuzzleHttp\Client as GuzzleClient;

class MockTaskController extends Controller
{

    protected $modelClass = \App\Models\MockTask::class;
    protected $qServerJsxUrl = 'http://localhost:7080/q/public/api/jsx';
    protected $publicFileDir = '/api/files/';

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        $models = $this->modelClass::orderBy('id', 'desc')->get();
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

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $model = new $this->modelClass;
        $model->title = $request->input('title');
        
        // handle file
        $reqFile = $request->file('file');
        $fileProps = MockController::handleFile($reqFile, $this->publicFileDir, null);
        $model->file_name = $fileProps['clientName'];
        $model->file_path = $fileProps['newName'];
        $model->file_hash = $fileProps['md5'];
        $model->save();
        
        // pass to queue
        $mockIds = $request->input('mockups');
        $resizeMode = $request->input('resize-mode');
        foreach ($mockIds as $mockId) {
            $this->createTaskJob($mockId, $model->id, $model->file_path, $resizeMode);
        }
        return $model;
    }

    protected function createTaskJob($mockId, $taskId, $taskFilePath, $resizeMode) {
        $taskJob = MockTaskJob::create([
            'mock_task_id' => $taskId,
            'mock_id' => $mockId,
            'q_job_id' => 0
        ]);
        $mock = Mock::find($mockId);
        $mockMeta = $mock->data_json;
        $mockToLayerAddress = $mockMeta['smart_layers'][$mockMeta['default_smart_layer']]['address'];
        $baseFileUrl = url($this->publicFileDir);
        $callbackUrl = route('taskQueueCallback', ['taskJobId'=>$taskJob->id]);
        $qJobRes = $this->sendSmartReplaceJobToQserver($baseFileUrl, $mock->file_path, 
            $taskFilePath, $mockToLayerAddress, $resizeMode, $callbackUrl);
        $taskJob->q_job_id = $qJobRes->job_id;
        $taskJob->save();
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
        $res = $client->post( $qserver_api_url_jsx,  ['json' => $jobLoad] );
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
        $mockTask = MockTask::find($id);
        $mockTask->load('jobs.mock');
        return response()->json($mockTask);
    }
	
	public function zipTaskFiles($id) {
		$files = [];
		$mockTask = MockTask::findOrFail($id);
		$mockTask->load('jobs');
		foreach ($mockTask->jobs as $job) {
			if ( isset($job->data) && isset($job->data['outputs']) && is_array($job->data['outputs']) )
				foreach ($job->data['outputs'] as $output) 				
					$files[] = realpath('download/' . $output);
		}
		//var_dump($files);
		//die();
		$zip = new \ZipArchive;
		$zippath = realpath("download") . "/$id.zip";

		if ($zip->open($zippath, \ZipArchive::CREATE) === TRUE)
		{
			// Add files to the zip file
			foreach ($files as $file) {
				$zip->addFile($file, basename($file));
			}

			// All files are added, so close the zip file.
			$zip->close();
		}
		return redirect(url("download/$id.zip"));
	}

    public function queueCallback($taskJobId, Request $request) {
        $callbackPayload = json_decode($request->getContent());
        $jobOutput = $callbackPayload->output;
        $outputFileName = $jobOutput->outputs[0];
        $this->transload("$callbackPayload->baseUrl/$outputFileName", "download/$outputFileName");
        $taskJob = MockTaskJob::find($taskJobId);
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
