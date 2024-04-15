<?php

namespace App\Http\Controllers;

use App\Models\Artwork;
use Illuminate\Http\Request;

use GuzzleHttp\Client as GuzzleClient;

class ArtworkController extends Controller
{

    protected $modelClass = \App\Models\Artwork::class;
    protected $publicFileDir = '/api/files/';

    public function index(Request $request)
    {
		$tenant = $request->tenant;
        $models = $this->modelClass::where('tenant', $tenant)
			->orderBy('id', 'desc')->get();
		foreach ($models as $model) {
			$model->status = 'done';
			$model->thumb_url = url($this->publicFileDir . $model->file_path);
		}
        return response()->json(['result'=>$models]);
    }

    public function store(Request $request)
    {
        $model = new $this->modelClass;
        $model->title = $request->input('title');
        $model->tenant = $request->tenant;

        // handle file
        $reqFile = $request->file('file');
        $fileProps = MockController::handleFile($reqFile, $this->publicFileDir, null);
        $model->file_name = $fileProps['clientName'];
        $model->file_path = $fileProps['newName'];
        $model->file_hash = $fileProps['md5'];
        $model->save();
		
        return $model;
    }

    public function show(Artwork $artwork)
    {
		$artwork->status = 'done';
		$artwork->thumb_url = url($this->publicFileDir . $artwork->file_path);
        return response()->json($artwork);
    }

    public function update(Request $request, Artwork $artwork)
    {
        //
    }

    public function destroy(Artwork $artwork)
    {
        $mock->delete();
        return response()->json($mock);
    }
	

}
