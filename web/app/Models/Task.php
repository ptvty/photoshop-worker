<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Task extends Model
{
    protected $fillable = ['mock_id', 'artwork_id', 'task_uuid', 'replacement', 'tenant', 'q_job_id', 'data'];

    protected $casts = [
        'data' => 'array',
    ];

    public function mock()
    {
        return $this->belongsTo(\App\Models\Mock::class);
    }    
	
	public function artwork()
    {
        return $this->belongsTo(\App\Models\Artwork::class);
    }
}
