# MiSheng App
<div style="display: flex; align-items: center; justify-content: space-between;">
  <div style="flex: 1; padding-right: 20px;">
    <p>MiSheng is a real-world puzzle-solving game（實境解謎遊戲） platform built with React + Vite.</p>
    <p>It allows creators to design interactive puzzle levels with custom questions, hints, and media files.</p>
    <p>By simply adding game files to the <code>gameFile</code> folder, you can instantly load and play new games.</p>
  </div>
  <div>
    <img src="public/MiSheng-logo-w.svg" alt="MiSheng Logo" width="200">
  </div>
</div>


# Installation
```
# Clone the repository (--recurse-submodules pulls in the demo game)
git clone --recurse-submodules https://github.com/rr37/MiSheng-App/

# Go to the project folder
cd MiSheng-App

# Install dependencies
npm install

# Start the development server
npm run dev

Then open your browser and navigate to the address shown in the terminal (usually http://localhost:5173).
```
# Adding a Game File 
> The example game at `src/gameFile/demo/` is a **git submodule** pointing to
> [MiSheng-demo-game](https://github.com/rr37/MiSheng-demo-game) (CC BY-NC 4.0).
> If `/demo` is blank, you cloned without submodules — run `git submodule update --init`.
> Your own games go straight into `src/gameFile/` and are gitignored.

1. Locate the src/gameFile/ folder.

2. Copy your game folder (or the provided example) into this directory.

3. The game folder should contain the necessary CSV data and related images.
4. Follow the example game’s structure for compatibility.

    ```
    my-game/
    ├── demo-character.csv
    ├── demo-config.csv
    ├── demo-hint.csv
    ├── demo-mission.csv
    ├── demo-prop.csv
    ├── demo-story.csv
    ├── demo-rundown.csv
    └── img/
    ```

5. Ensure the folder name is unique.

6. Run the development server:

    ```
    # Start the development server
    npm run dev

    Then open your browser and navigate to the address shown in the terminal (usually http://localhost:5173).
    ```

## MiSheng's Multirow Universe（Tutorial Game File）
If you don't have your own game file yet, you can start with MiSheng's Multirow Universe, our tutorial game file:

[Download MiSheng's Multirow Universe](https://github.com/rr37/MiSheng-demo-game)

## Google Sheets Template
To help you create your game CSV files, we provide a blank Google Sheets template you can copy:
Click [here](https://docs.google.com/spreadsheets/d/16U8l6eeu7BaWwH3TOf09T40FkHmVKJepNWtA9pjBQfU/edit?usp=sharing) to copy the template

After editing in Google Sheets:

- Download each sheet as CSV (File → Download → CSV).
- Place them in your game folder (follow the example folder structure).

# License
© Dong 2025. Released as free software under the [GNU GPL 3.0 Public License](https://github.com/rr37/MiSheng-App/blob/main/LICENSE).