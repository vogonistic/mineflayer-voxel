# mineflayer-voxel

Attempt at visualizing what the bot is up to using voxel.js

![](https://raw.github.com/vogonistic/mineflayer-voxel/master/screenshot.jpg)

### Ideas

* Turn module into something that can be added to any mineflayer bot
* Disconnect viewing from bot so you can explore the area

### Precondition

You must extract textures from minecraft.jar (Note, must be snapshot, not the current release!).

`node extract_textures.js <path_to_minecraft.jar>`

For example `node extract_textures.js ~/.minecraft/versions/1.8/1.8.jar`

### Usage

`npm start`