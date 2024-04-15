<?php

namespace App\Http\Controllers;

use App\JobDetail;
use Illuminate\Http\Request;
use DispatchesJobs;

class JobController extends Controller
{

    protected $dirInputs  = 'jobs/inputs/';
    protected $dirOutputs = 'jobs/outputs/';

    public function newJob(Request $request)
    {
        $reqBody = $request->getContent();
        $jobLoad = new \stdClass;
        if ($reqBody == "") {
            $recipe = json_decode($this->testRecipe());
        } else {
            $recipe = json_decode($reqBody);
        }
        if ( is_null($recipe) || !isset($recipe->base))
            return response()->json(['ok'=>false]);
    
        $jobLoad->recipe = $recipe;
        $jobLoad->config = new \stdClass;
        $jobLoad->config->dirInputs = realpath($this->dirInputs);
        $jobLoad->config->dirOutputs = realpath($this->dirOutputs);

        $job = (new \App\Jobs\JsxJob($jobLoad))->onQueue('jsx');
        try {
            $job->beforeDispatch();
            $jobId = $this->dispatch($job);
            $job->afterDispatch($jobId);
        } catch (\Exception $e) {
            \Log::warning($e);
            return response()->json(['ok'=>false]);
        }
        return response()->json(['ok'=>true, 'job_id'=>$jobId]);
    }

    public function getJob($jobId)
    {
        $this->jobConfig = [
            'baseDir' => storage_path('app') . '\\'
        ];
        $jobDetail = JobDetail::where('job_id', $jobId)->firstOrFail();
        $jobDetail->input = json_decode($jobDetail->input);
        $jobDetail->output = json_decode($jobDetail->output);
        $jobDetail->config = $this->jobConfig;
        return response()->json($jobDetail);
    }

    public function updateJob($jobId, Request $request)
    {
        $reqBody = $request->getContent();
        $jobDetail = JobDetail::where('job_id', $jobId)->firstOrFail();
        $output = json_decode($jobDetail->output);
        if ($output == null) {
            $output = new \stdClass;
        }
        $outputKey = $request->input('update', null);
        if ($outputKey) {
            $output->{$outputKey} = $reqBody;
        }
        $jobDetail->output = json_encode($output);
        return ($jobDetail->save()) ? ['ok'=>true] : ['ok'=>false];
    }

    protected function testRecipe() {
        $baseUrl = url('/jobs/test');
        $json = '
            {
                "baseUrl":  "' . $baseUrl . '/",
                "inputs":   ["test.psd", "test.jpg"],
                "base":     "test.psd",
                "tasks":    [
                    {
                        "type":       "smart_replace_resized",
                        "from":       "test.jpg",
                        "to":         [0,2],
                        "resizeMode": "fit"
                    }
                ],
                "outputs":  [
                    {
                        "type": "jpeg",
                        "quality": 80
                    },
                    {
                        "type": "psd"
                    }
                ],
                "callback": "http://localhost/callback"

            }
        ';
        $json = '
            {
                "baseUrl":  "' . $baseUrl . '/",
                "inputs":   ["test.psd", "test.jpg"],
                "base":     "test.psd",
                "tasks":    [
                    {
                        "type":       "layer_tree"
                    },
                    {
                        "type":       "smart_replace_resized",
                        "resizeMode": "tile",
                        "from":       "test.jpg",
                        "to":         [0,1]
                    }
                ],
                "outputs":  [
                    {
                        "type": "jpg"
                    },
                    {
                        "type": "psd"
                    }
                ]
            }
        ';
        return $json;
    }
}
