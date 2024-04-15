<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;

use GuzzleHttp\Client as GuzzleClient;


class TextRenderJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    private $load;

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
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        sleep(1); // prevent jam
        $this->setConfigs();

        $jobId = $this->job->getJobId();
        echo("Job ID: $jobId\n");
        $load = $this->load;
        $this->writeJobFile($jobId, $load);
        $this->execTextrenderExe($jobId);
        $this->moveFilesToPublic($jobId);
        $jobResult = $this->prepareResult($jobId);
        file_put_contents($this->publicDir . '\\' . $jobId . '\\result.json', json_encode($jobResult));
        $cbRe = $this->callback($jobResult, $load->callback_url);
    }

    public function setConfigs()
    {   // Defining Pathes
        $bd = "C:\\ca\\text";
        $this->baseDir    = $bd;
        $this->jobDir     = $bd . "\\job";
        $this->outDir     = $bd . "\\out";
        $this->publicDir  = "C:\\xampp\\htdocs\\q\\public\\textrenderjob";
        $this->remoteBase = "http://localhost/q/public/textrenderjob";
    }


    public function prepareResult($jobId)
    {
        list($w, $h) = getimagesize($this->outDir . "\\$jobId.png"); 
        return (Object) ['width'=>$w, 'height'=>$h, 
            'imageurl' => $this->remoteBase . "/$jobId/$jobId.png"];

    }

    public function callback($jobResult, $callback_url)
    {
        $cb = ['ok'=>true, 'result'=>$jobResult];
        $client = new GuzzleClient;
        $res = $client->post( $callback_url,  ['json' => $cb] );
        return $res->getBody()->getContents();
    }

    public function moveFilesToPublic($jobId)
    {
        $outJ = $this->outDir ;
        $pubJ = $this->publicDir . '\\' . $jobId;
        $pngFiles = [$jobId.'.png'];
        mkdir($pubJ);
        foreach ($pngFiles as $pngFile) {
            copy("$outJ\\$pngFile", "$pubJ\\$pngFile");
        }
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


    public function execTextrenderExe($argument)
    {
        $exeDir = $this->baseDir . "\\textrender.exe";
        $cmd = "$exeDir $argument";
        return exec($cmd);
    }


    public function getDemoLoad()
    {
        $sampleJson = '{"text":"Sample Text", "direction":"rtl", "kind":"point", "font_family":"Arial", "size":32, "width":0, "align":"center", "color":{"r":200,"g":20,"b":30}}';
        $load = json_decode($sampleJson);
        $load->callback_url = "http://localhost/";
        return $load;
    }

}
