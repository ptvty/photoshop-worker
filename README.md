# Photoshop Worker

Automate Photoshop tasks using Photoshop's ExtendScript (JSX) and an easy to use web UI. Create bulk mockups from your artworks and PSD mockup files with ease.

## ⚠️ Attention

This project was created some time ago and may still be compatible with newer versions of Adobe Photoshop. However, please note that it is no longer actively maintained. Feel free to draw inspiration from it and modernize its workflow according to your requirements.

## 🛠️ Installation

### Requirements

- Windows machine
- Adobe Photoshop installed (tested on 25.0.0)
- Laravel 5.5 requirements (MySQL, PHP 5.4, Composer, and standard PHP extensions)

### Setup

Clone the repository to the root directory of your `C:\` drive, with the repository's root located at `C:\photoshop-worker`.

This repository consists of two Laravel projects: `web` and `worker`.

First, `cd` to the `web` directory and run `composer update`. Once the update is complete, run `php artisan migrate`. If any errors occur during migration, double-check the database configuration in the `.env` file.
Next, run the `.\START-SERVER.cmd` script. This will start the server, which should now be running on port 8030. To verify that the server is running correctly, open your web browser and visit `http://127.0.0.1:8030/app/app.html`.

In a new terminal, navigate to the `worker` directory and run `composer update`, then run `php artisan migrate`. Once the update is complete, run `.\START-SERVER.cmd`. This will start the worker server, which should now be running on port `8031`.

Open a third terminal window, navigate to the `worker` directory, and run `./START-QUEUE.cmd` to start the queue processor.

## Usage

- Visit `http://127.0.0.1:8030/app/app.html` in your browser and enter whatever name as tenant ID. 

![step-1](doc/step-1.jpg?raw=true)

- Prepare and upload your PSD file. Ensure that it includes one Smart Object. When you double-click on a Smart Object, it opens a new tab where you can edit its contents.

![step-2](doc/step-2.jpg?raw=true)

- Upload or select the image file you want the script to place inside the first Smart Object it finds in the selected PSD.

![step-3](doc/step-3.jpg?raw=true)

- Choose the placement mode, **Tile** and **Fill** are best suited for patterns, while **Center** and **Fit** are preferable for logos.

![step-4](doc/step-4.jpg?raw=true)

- Wait for the worker to finish the tasks.

![step-5](doc/step-5.jpg?raw=true)

- Select the images you'd like to download as a ZIP file.

![step-6](doc/step-6.jpg?raw=true)
