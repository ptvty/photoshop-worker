<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MockTaskJob extends Model
{
    protected $fillable = ['mock_id', 'mock_task_id', 'q_job_id'];

    protected $casts = [
        'data' => 'array',
    ];

    public function mock()
    {
        return $this->belongsTo(\App\Models\Mock::class);
    }
}
