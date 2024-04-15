<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\MockTag;

class Mock extends Model
{

    protected $casts = [
        'data_json' => 'array',
        'layer_tree' => 'array',
    ];

    public function tags() {
        return $this->hasMany(MockTag::class);
    }

    public function proccessSmartObject()
    {
        if ($this->layer_tree == null) return;
        $layers = $this->flattenLayerTree($this->layer_tree);
        $smartLayers = $this->smartObjectLayers($layers);
        if (count($smartLayers) === 0) {
            $smartLayers = null;
        }
        $this->setJsonValue('smart_layers', $smartLayers);
        $this->setJsonValue('default_smart_layer', 0);
        $this->save();
    }

    public function smartObjectLayers($layers)
    {
        $smartLayers = [];
        foreach ($layers as $layer) {
            if ( isset($layer['kind']) && strpos($layer['kind'], 'SMARTOBJECT') !== false ) {
                $smartLayers[] = $layer;
            }
        }
        return $smartLayers;
    }

    public function flattenLayerTree($layerTree, $parentIndexAddress = []) {
        // flatten layer tree
        $layers = [];
        foreach ($layerTree as $i => $node) {
            $indexAddress = array_merge($parentIndexAddress, [$i]);
            if ( is_array($node) && isset($node['layers']) ) {
                $gotLayers = $this->flattenLayerTree($node['layers'], $indexAddress);
            } else {
                $gotLayers = [[
                    'address'=>$indexAddress, 
                    'name'=>$node['name'], 
                    'type'=>$node['type'], 
                    'kind'=>$node['kind'],
                ]];
            }
            $layers = array_merge($layers, $gotLayers);
        }
        return $layers;
    }

    public function setJsonValue($key, $value)
    {
        $data = (is_array($this->data_json)) ? $this->data_json : [];
        $data[$key] = $value;
        $this->data_json = $data;
        $this->save();
    }
}
