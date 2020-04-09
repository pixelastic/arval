# )- arval

Arval creates a mirror of the file structure of any directory, and keeps both in
sync. The mirrored files are dummy lightweight files, allowing you to more
quickly remove, rename and reorganze them.

## Rationale

I have a directory holding a fair amount of very large pictures. I need to
reorganize the file structure and rename a bunch of files there. For that,
I need to know what each file represents, but because the images are very large
and heavy, opening them in a viewer takes forever.

I build Arval to help me with this situation. Arval creates a directory that
mirrors the file structure of my original directory, with the exact same number
of files, with the exact same name. But this files are thumbnails of the
original ones. This allow me to more quickly navigate in my file structure, move
things around and rename files. Once I'm done, I just need to run Arval again so
my changes are synchronized with the source directory.

## Installation

We recommend installing `arval` globally.

```sh
yarn add --global arval
```

## Warning

Because Arval is meant to rename, remove and move files around, you need to use
it with caution. Any misconfiguration or bug in the code could result in data
loss of your source folder.

We highly recommend you create a backup of your source folder before you use
Arval.

## Usage

You need to create a `arvalrc.json` file in the directory where `arval` will be
used.

```json
{
  "source": "./src",
  "mirror": "./mirror",
  "resize": 800
}
```

| Key      | Default value | Description                                                                               |
| -------- | ------------- | ----------------------------------------------------------------------------------------- |
| `source` | N/A           | Path to the source folder, relative to the `arvalrc.json` file                            |
| `mirror` | N/A           | Path to the mirror folder, relative to the `arvalrc.json` file. Will be created if needed |
| `resize` | 800           | Max dimension images will be resized to                                                   |

Then, you can run `arval`

```sh
$ arval
```

## What it does

Arval will create a copy of your `source` directory structure into the `mirror`
directory, but all files will be replaced with dummy lightweight files (or in
the case of images with thumbnails) keeping the same name and structure.

You can reorganize the mirror as you want. Delete files, move them around,
rename them. Once you're done, run `arval` again. All you changes in the mirror
will be synchronized back the original `source` folder.
