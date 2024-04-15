<?php

namespace App\Http\Controllers;

use App\Models\Mock;
use App\Models\MockTag;
use Illuminate\Http\Request;

use GuzzleHttp\Client as GuzzleClient;

class MockController extends Controller
{

    protected $modelClass = \App\Models\Mock::class;
    protected $qServerJsxUrl = 'http://127.0.0.1:8031/api/jsx';
    protected $publicFileDir = '/api/files/';

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
		$tenant = $request->tenant;
        $models = $this->modelClass::where('tenant', $tenant)
			->with('tags')->orderBy('id', 'desc')->get();
		foreach ($models as $mock) {
			$mock->status = (null == $mock->layer_tree) ? 'proccessing' : 'done';
			$mock->status = ( 'error' == ($mock->data_json['status'] ?? null) ) ? 'error' : $mock->status;
			$mock->thumb_url = $mock->data_json['thumb_dir'] ?? null;
			$mock->thumb_url = (null != $mock->thumb_url) ? url('download/'.$mock->thumb_url) : null;
		}
        return response()->json(['result'=>$models]);
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
		$model->tenant = $request->tenant;
        
        // handle file
        $reqFile = $request->file('file');
        $publicFileDir = '/api/files/';
        $fileProps = $this->handleFile($reqFile, $publicFileDir, 'psd');
        // dd($reqFile->getRealPath());
        $model->file_name = $fileProps['clientName'];
        $model->file_path = $fileProps['newName'];
        $model->file_hash = $fileProps['md5'];
        $model->save();

        // add tags
        $tags = $request->input('tag', []);
        $tags = array_map(function($el) use ($model) {
            return ['title' => $el, 'mock_id' => $model->id];
        }, $tags);
        $model->tags()->delete();
        $model->tags()->insert($tags);

        // pass to queue
        $callbackUrl = route('mockQueueCallback', ['mockId'=>$model->id]);
        $baseFileUrl = url($publicFileDir);
        $qJobRes = $this->sendLayerTreeJobToQserver($baseFileUrl, $model->file_path, $callbackUrl);
        $model->q_job_id = $qJobRes->job_id;
        $model->save();
        return $model;
    }

    static public function handleFile($reqFile, $fileMoveDir, $extention) {
        if (!$reqFile->isValid()) return ['ok'=>false];
        $fileMd5 = md5_file($reqFile->getRealPath());
        $fileClientName = $reqFile->getClientOriginalName();
        $fileMoveDir = public_path() . $fileMoveDir;
        $extention = (is_string($extention)) ? $extention : pathinfo($fileClientName, PATHINFO_EXTENSION);
        $fileNewName = "$fileMd5.$extention";
        $reqFile->move($fileMoveDir, $fileNewName);
        return [
            'clientName' => $fileClientName,
            'newName' => $fileNewName,
            'md5' => $fileMd5,
        ];
    }

    protected function sendLayerTreeJobToQserver($baseUrl, $baseFileName, $callbackUrl) {
        $qserver_api_url_jsx = $this->qServerJsxUrl . '/new-job';
        $jobLoad = [
            'baseUrl' => $baseUrl,
            'inputs'  => [$baseFileName],
            'base'    => $baseFileName,
            'tasks'   => [ ['type'=>'layer_tree'] ],
            'outputs' => [ ['type'=>'jpg'] ],
            'callback' => $callbackUrl,
        ];
        $client = new GuzzleClient;
        $res = $client->post( $qserver_api_url_jsx,  ['json' => $jobLoad, 'timeout' => 15.0] );
        return json_decode($res->getBody()->getContents());
    }

    /**
     * Display the specified resource.
     *
     * @param  \App\Models\Mock  $mock
     * @return \Illuminate\Http\Response
     */
    public function show(Mock $mock)
    {
        //$mock->proccessSmartObject();
		$mock->status = (null == $mock->layer_tree) ? 'proccessing' : 'done';
		$mock->status = ( 'error' == ($mock->data_json['status'] ?? null) ) ? 'error' : $mock->status;
		$mock->thumb_url = $mock->data_json['thumb_dir'] ?? null;
		$mock->thumb_url = (null != $mock->thumb_url) ? url('download/'.$mock->thumb_url) : null;
        return response()->json($mock);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Models\Mock  $mock
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, Mock $mock)
    {
        $mock->title = $request->input('title') ?? $mock->title;
		if ($request->input('default_smart_layer'))
			$mock->setJsonValue('default_smart_layer', $request->input('default_smart_layer'));

		if ($request->input('do_proccess_psd') === 'true') {
			$callbackUrl = route('mockQueueCallback', ['mockId'=>$mock->id]);
			$baseFileUrl = url($this->publicFileDir);
			$qJobRes = $this->sendLayerTreeJobToQserver($baseFileUrl, $mock->file_path, $callbackUrl);
			$mock->q_job_id = $qJobRes->job_id;
		}
        $mock->save();
        return response()->json($mock);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  \App\Models\Mock  $mock
     * @return \Illuminate\Http\Response
     */
    public function destroy(Mock $mock)
    {
        $mock->tags()->delete();
        $mock->delete();
        return response()->json($mock);
    }

    public function queueCallback($mockId, Request $request) {
        $mock = Mock::find($mockId);
		$callbackPayload = json_decode($request->getContent());
		if ( null == ($callbackPayload->output->layer_tree ?? null) ) {
			$mock->setJsonValue('status', 'error');
			return;
		}
        $layerTree = $callbackPayload->output->layer_tree;
        $mock->layer_tree = json_decode($layerTree);
        $mock->save();
        $mock->proccessSmartObject();
		
		// download thumb
        $outputFileName = $callbackPayload->output->outputs[0];
        $this->transload("$callbackPayload->baseUrl/$outputFileName", "download/$outputFileName");
		$mock->setJsonValue('thumb_dir', $outputFileName);
        return ['ok'=>true];
    }
	
	protected function transload($from, $to)
    {
        $fileContent = file_get_contents($from);
        file_put_contents($to, $fileContent);
    }

}
