<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateMockTaskJobsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('mock_task_jobs', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedBigInteger('mock_task_id');
            $table->unsignedBigInteger('mock_id');
            $table->unsignedBigInteger('q_job_id');
            $table->json('data')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('mock_task_jobs');
    }
}
