<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\MockTag;

class Artwork extends Model
{

    protected $casts = [
        'data_json' => 'object',
    ];


    public function setJsonValue($key, $value)
    {
        $data = (null != $this->data_json) ? $this->data_json : new stdClass;
        $data->{$key} = $value;
        $this->data_json = $data;
        $this->save();
    }
}
