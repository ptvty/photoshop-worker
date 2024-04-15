<?php

namespace App;

use Illuminate\Database\Eloquent\Model;

class Job extends Model
{
    public function jobDetail($job)
    {
        return $job->hasOne('\App\JobDetail');
    }
}
