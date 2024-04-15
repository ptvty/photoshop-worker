<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MockTask extends Model
{
    public function jobs()
    {
        return $this->hasMany(\App\Models\MockTaskJob::class);
    }
}
