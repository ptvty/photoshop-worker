<?php

use App\Jobs\JsxJob;
use Illuminate\Http\Request;

use Illuminate\Contracts\Bus\Dispatcher;

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
Route::get('/jsx/test', function (Request $request) {
	return 'hi';
});

Route::middleware('auth:api')->get('/user', function (Request $request) {
    return $request->user();
});

Route::any('/new-job/psd', function (Request $request) {
	if (\Config::get('queue.default') != 'database')
		return response()->json(['ok'=>false]);;
	$reqBody = $request->getContent();
	$jobLoad = new \stdClass;
	if ($reqBody == "") {
		$jobLoad->demo = true;
		$job = (new \App\Jobs\PsdJob($jobLoad))->onQueue('psd');
		$jobId = app(Dispatcher::class)->dispatch($job);
		return response()->json(['ok'=>true, 'job_id'=>$jobId]);
	}
	$load = json_decode($reqBody);
	if ( is_null($load) )
		return response()->json(['ok'=>false]);

	if ( !isset($load->psd_url) || !isset($load->callback_url) )
		return response()->json(['ok'=>false]);

	$jobLoad->psd_url 	   = $load->psd_url;
	$jobLoad->callback_url = $load->callback_url;
	$job = (new \App\Jobs\PsdJob($jobLoad))->onQueue('psd');
	$jobId = app(Dispatcher::class)->dispatch($job);
	return response()->json(['ok'=>true, 'job_id'=>$jobId]);
});

Route::any('/new-job/textrender', function (Request $request) {
	$reqBody = $request->getContent();
	$jobLoad = new \stdClass;
	if ($reqBody == "") {
		$jobLoad->demo = true;
		$job = (new \App\Jobs\TextRenderJob($jobLoad))->onQueue('textrender');
		$jobId = app(Dispatcher::class)->dispatch($job);
		return response()->json(['ok'=>true, 'job_id'=>$jobId]);
	}
	$load = json_decode($reqBody);
	if ( is_null($load) || !isset($load->text) || !isset($load->color))
		return response()->json(['ok'=>false]);

	// validate($laod);
	$jobLoad = $load;
	$job = (new \App\Jobs\TextRenderJob($jobLoad))->onQueue('textrender');
	$jobId = app(Dispatcher::class)->dispatch($job);
	return response()->json(['ok'=>true, 'job_id'=>$jobId]);

});

Route::any('/jsx/new-job',				'JobController@newJob');
Route::any('/jsx/get-job/{jobId}',		'JobController@getJob');
Route::any('/jsx/update-job/{jobId}',	'JobController@updateJob');
