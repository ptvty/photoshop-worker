<?php

use Illuminate\Http\Request;

use GuzzleHttp\Client as GuzzleClient;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('auth:api')->get('/user', function (Request $request) {
    return $request->user();
});

Route::resource('mocks', MockController::class);
Route::resource('artworks', ArtworkController::class);
Route::resource('tasks', TaskController::class);

Route::post('queue_callback/mocks/{mockId}', 'MockController@queueCallback')->name('mockQueueCallback');
Route::post('queue_callback/tasks/{taskJobId}', 'TaskController@queueCallback')->name('taskQueueCallback');

Route::get('v0/design/get-designs', function (Request $request)
{
	$d = \App\Design::all();
	unset($d->data_json);
	return response()->json( ['ok'=>true, 'result'=>$d] );
});

Route::get('v0/design/get-design/{id}', function (Request $request, $id)
{
	// $d = get_sample_design();
	$d = \App\Design::findOrFail($id);
	$d->data = json_decode($d->data_json);
	unset($d->data_json);
	return response()->json( ['ok'=>true, 'result'=>$d] );

});

Route::get('testqserver', function (Request $request)
{
	$re = send_job_to_qserver(0, 'demopsd.psd');
	return response()->json($re);
});

// CALL-BACK END-POINTS

// Psd Callback
Route::any('v0/cb/psd/{designId}', function (Request $request, $designId)
{
	$json = $request->getContent();
	$cb = json_decode($json);
	if ($cb == null || !isset($cb->ok) || !$cb->ok || !isset($cb->result) ) {
		//handle error, request repeat, or what?
		return;
	}
	$r = $cb->result;
	$d = \App\Design::findOrFail($designId);
	$d->width = $r->doc_width;
	$d->height = $r->doc_height;
	$d->layer_count = count($r->layers);
	$d->data_json = json_encode($r);
	$d->save();
});

// Textrender Callback
Route::post('v0/cb/textrender/{textrenderId}', function (Request $request, $textrenderId)
{
	$json = $request->getContent();
	$cb = json_decode($json);
	if ($cb == null) return;
	$tr = \App\Textrender::findOrFail($textrenderId);
	$tr->result_json = json_encode($cb->result);
	$tr->save();
});

Route::get('v0/design/edit-text/textrender/{textrenderId}', function (Request $request, $textrenderId)
{
	$tr = \App\Textrender::findOrFail($textrenderId);
	$data = json_decode($tr->result_json);
	return response()->json(['ok'=>true, 'result'=>$data]);
});

Route::post('v0/design/edit-text/{designId}/{layerId}', function (Request $request)
{
	$json = $request->getContent();
	$jobLoad = json_decode($json);
	if ($jobLoad == null)
		return 1;
	$requireds = ['text', 'direction', 'kind', 'font_family', 'size', 'width', 'align', 'color'];
	foreach ($requireds as $required)
		if ( !isset($jobLoad->{$required}) ) return response()->json(['ok'=>false]);

	$tr = new \App\Textrender;
	$tr->result_json = '';
	$tr->save();
	$re = send_textrender_job_to_qserver($tr->id, $jobLoad);
	$re->textrender_id = $tr->id;
	$tr->save();
	return response()->json(['ok'=>true, 'result'=>$re]);
});

Route::post('v0/design/new-from-psd', function (Request $request)
{
	if (!isset($_POST['title']) || trim($_POST['title'])=="" ||
	    !isset($_FILES['file']))
		return response()->json(['ok'=>false, 'status'=>'required fields error']);

	$re = upload_file('psduploads', ['psd']);
	if (!$re['ok']) return $re;
	$d = new \App\Design;
	$d->title = $_POST['title'];
	$d->file_name = $re['file_name'];
	$d->file_path = $re['file_path'];
	$d->save();
	$re = send_job_to_qserver($d->id, $re['file_path']);
	$d->q_job_id = $re->job_id;
	$d->save();
	return response()->json($d);
});

Route::post('v0/editor/upload-image', function (Request $request)
{
	if (!isset($_FILES['file']))
		return response()->json(['ok'=>false, 'status'=>'required fields error']);

	$re = upload_file('imageuploads', ['jpg','png', 'jpeg'], true);
	if (!$re['ok']) return $re;
	$d = [  'file_name' => $re['file_name'], 'file_path' => $re['file_path'],
			'width' 	=> $re['width'],	 'height' 	 => $re['height']	];
	return response()->json($d);
});

function send_textrender_job_to_qserver($textrenderId, $jobLoad) {
	$qserver_api_url_textrender = 'http://localhost/q/public/api/new-job/textrender';
	$client = new GuzzleClient;
	// try {} 
	$jobLoad->callback_url = 'http://localhost/ca/public/api/v0/cb/textrender/' . $textrenderId;
	$res = $client->post( $qserver_api_url_textrender,  ['json' => $jobLoad] );
	return json_decode($res->getBody()->getContents());
}

function send_job_to_qserver($designId, $filePath)
{
	$qserver_api_url_psd = 'http://localhost/q/public/api/new-job/psd';
	$jobLoad = [
		'psd_url'=>'http://localhost/ca/public/' . $filePath,
		'callback_url'=>'http://localhost/ca/public/api/v0/cb/psd/' . $designId];
	$client = new GuzzleClient;
	// try {} 
	$res = $client->post( $qserver_api_url_psd,  ['json' => $jobLoad] );
	return json_decode($res->getBody()->getContents());
}

function upload_file($server_path, $valid_exts = ['psd'], $image_mode=false)
{
	// $valid_exts = array('psd'); // valid extensions
	$max_size = 300 * 1024* 1024; // max file size in bytes
	$re = ['ok'=>false];
	$upfile = $_FILES['file'];
	// for($i=0;$i<count(['tmp_name']);$i++)
	// {
	$path="$server_path/";

	if(!is_uploaded_file($upfile['tmp_name']) )	{
		\Log::info($upfile['error']);
		$re['status'] = 'Upload Fail: File not uploaded!';
		return $re;
	}
	// get uploaded file extension
	$ext = strtolower(pathinfo($upfile['name'], PATHINFO_EXTENSION));
	$re['file_name'] = $upfile['name'];
	// looking for format and size validity
	if (!in_array($ext, $valid_exts) || $upfile['size'] > $max_size) {
		$re['status'] = 'Upload Fail: Unsupported file format or It is too large to upload!';
		return $re;
	}
	// unique file path
	$uid = uniqid();
	$date = date('Y-m-d-H-i-s');
	$path = $path ."file_" .$date. '_' . $uid . "." .$ext;
	$re['file_path'] = $path;

	$returnJson[]= array("filepath"=>$path);

	$filename = "file_" . $date . "_" .$uid . "." . $ext;
	// move uploaded file from temp to uploads directory
	if (!move_uploaded_file($upfile['tmp_name'], $path)) {
		$re['status'] = 'Upload Fail: Unknown error occurred!';
		return $re;
	}
	if ($image_mode) {
		list($re['width'], $re['height']) = getimagesize($path);
	}
	$re['ok'] = true;
	return $re;
}


function get_sample_design()
{
	$text1 = [
	    'text'=> 'Hello World',
	    'align'=> 'center',
	    'direction'=> 'rtl',
	    'size'=> 72,
	    'font'=> 'IRYekan',
	    'color'=> [23,7,200],
	    'kind'=> 'point'
	];

	$layer0 = [
	    'title'=> 'image layer',
	    'width'=> 500,
	    'height'=> 500,
	    'top'=> 33,
	    'left'=> 340,
	    'image'=> '../ly/255/0.png',
	    'type'=> 'image'
	];

	$layer1 = [
	    'title'=> 'text layer',
	    'width'=> 100,
	    'height'=> 200,
	    'top'=> 330,
	    'left'=> 34,
	    'image'=> '../ly/255/1.png',
	    'type'=> 'text',
	    'text'=> $text1
	];

	$designModel = [
	    'title'=> 'New Design',
	    'width'=> 1450,
	    'height'=> 800,
	    'layers'=> [
	        $layer0,
	        $layer1
	    ]
	];

	return $designModel;

}