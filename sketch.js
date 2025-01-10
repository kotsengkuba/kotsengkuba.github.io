const fps = 12;
const fontName = 'fonts/CutiveMono-Regular.ttf';

const asciiSet = '#$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/()1{}[]?-_+~<>i!lI;:,"^`.  ';



const shadowOffset = 5;

let clickIndex = 0;
let fileNames = [
  "titlepage.txt", 
  "intropage.txt", 
  "borderspage_01.txt", 
  "airportspage_01.txt",
  "airportspage_02.txt",
  "calatoniapage_01.txt",
  "kapwapage_01.txt",
  "foodpage_01.txt",
  "foodpage_02.txt",
  "languagepage_01.txt",
  "soundpage_01.txt",
  "soundpage_02.txt",
  "pi100page_01.txt",
  "leveluppage_01.txt",
  "back2startpage_01.txt",
  "back2startpage_02.txt"
];

let textBoxes = [];
let sceneTitleTextBox;
let pageTitleTextBox;
let titleX = 0;
let titleY = 0;

let asciiSize = 24;
let defaultFontSize = 16;

let characterSet; // The character set object, contains the texture of the characters to be used in the shader

let slidesShader;
let shaderLayer;
let imageLayer;
let topLayer;

let currScene;
let currSceneIndex = 0;
let currPageIndex = 0;
let loadedImages = [];
let fileLoaded = false;

function preload() {  
  font = loadFont(fontName);
  scenesData = loadStrings("/content/" + fileNames[0]);
  slidesShader = loadShader("base.vert", "shader.frag");
}

function setup() {
  p5Canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  p5Canvas.parent("main-div");
  frameRate(fps);
  background(0);

  shaderLayer = createGraphics(width, height, WEBGL);
  shaderLayer.shader(slidesShader);
  imageLayer = createGraphics(width, height, WEBGL);
  topLayer = createGraphics(width, height, WEBGL);

  loadSceneFromFile();
  characterSet = new CharacterSet({font: font, fontSize: asciiSize, characters: asciiSet });
}

function mouseClicked() {
  
  let shouldSceneChange = false;
  // track clicks if left or right side of the screen
  if(mouseX < width/2) {
    if(currPageIndex > 0) {
      currPageIndex--;
    } else if(currSceneIndex > 0) {
      currSceneIndex--;
      shouldSceneChange = true;
    } else {
      // first page is reached.. do nothing
    }
  } else {
    if(currPageIndex < currScene.getPageCount()-1) {
      currPageIndex++;
    } else if (currSceneIndex < fileNames.length-1) {
      currSceneIndex++;
      shouldSceneChange = true;
    } else {
      // end is reached.. return to first page
      currSceneIndex = 0;
      shouldSceneChange = true;
    }     
  }

  // reload files
  if(shouldSceneChange) {
    fileLoaded = false;
    topLayer.clear();
    scenesData = loadStrings("/content/" + fileNames[currSceneIndex], loadSceneFromFile);
  }

  loadPageTextBox();
  loadTextBoxes();
  

}

function draw() {
  
  // fun animation
  //topLayer.rotateX(sin(frameCount/500));
  //topLayer.rotateZ(tan(frameCount/500));
  //topLayer.rotateY(frameCount/2000);
  //topLayer.rotateZ(frameCount/2000);
  
  if(frameCount % (fps) == 0) {
    titleX = random(0, width/2);
    titleY = random(50, windowHeight);
  }

  asciiSize = floor(mouseY/30);
  if(asciiSize >= 4) characterSet.setFontSize(asciiSize);

  shaderLayer.clear();
  shaderLayer.background(20,30,10,255);
  shaderLayer.rect(0, 0); // idk why this works
  setShaderValues();
  
  // redraw when everythings loaded
  if(fileLoaded) {
    topLayer.clear();
    sceneTitleTextBox.draw(topLayer, 0, 0, false);
    pageTitleTextBox.draw(topLayer, 0, 50, false);

    let tempY = 0;
    for(let i = 0; i < textBoxes.length; i++) {
      textBoxes[i].draw(topLayer, width/2, tempY, false);
      tempY += textBoxes[i].getHeight();
    }

    loadImageLayer();

    clear();
    push();
    translate(-width/2, -height/2);
    image(shaderLayer, 0, 0);
    image(topLayer, 0, 0);
    pop();
  }
  
}

function setShaderValues() {
  slidesShader.setUniform('u_simulationTexture', imageLayer); // The texture containing the simulation, which is used to create the ASCII character grid

  slidesShader.setUniform('u_characterTexture', characterSet.getTexture()); // The 2D texture containing the character set
  slidesShader.setUniform('u_charsetCols', float(characterSet.getColumns())); // The number of columns in the charset texture
  slidesShader.setUniform('u_charsetRows', float(characterSet.getRows())); // The number of rows in the charset texture
  slidesShader.setUniform('u_totalChars', characterSet.getTotalChars()); // The total number of characters in the character set texture

  slidesShader.setUniform('u_gridOffsetDimensions', [0, 0]); // The dimensions of the grid offset in pixels

  let cell = characterSet.getMaxGlyphDimensions(characterSet.fontSize);
  let gridDimensions = [floor(width/cell.width), float(height/cell.height)];
  slidesShader.setUniform('u_gridPixelDimensions' , [width, height]); // The dimensions of the grid cell in pixels (total width and height)
  slidesShader.setUniform('u_gridDimensions', gridDimensions); // The dimensions of the grid in number of cells

  slidesShader.setUniform('u_characterColor', [0.0, 0.0, 0.0]); // The color of the ASCII characters
  slidesShader.setUniform('u_characterColorMode', 0); // The color mode (0 = image color, 1 = single color)
  slidesShader.setUniform('u_backgroundColor', [1.0, 1.0, 1.0]); // The background color of the ASCII art
  slidesShader.setUniform('u_backgroundColorMode', 0); // The background color mode (0 = image color, 1 = single color)

  slidesShader.setUniform('u_invertMode', 0); // The character invert mode (0 = normal, 1 = inverted)

  slidesShader.setUniform('u_randBrightness', [random(0.1, 0.125), random(0.1, 0.625), random(0.1, 0.12)]); // randomize brightness threashold

}

function loadSceneFromFile() {
  currPageIndex = 0;
  loadedImages = [];
  let line = scenesData[0];
  fileLoaded = true;

  if(line.startsWith("# "))
    currScene = new Scene({title: line});
  else
    currScene = new Scene({title: "Untitled"});

  let tempPage;
  let currText = "";
  for (let i = 0; i < scenesData.length; i++) {
    let line = scenesData[i];
    
    if(line.startsWith("## ")){
      if(tempPage == undefined) { // first
        tempPage = {
          "title": "",
          "text": []
        };
        tempPage.title = line;
      } else {
        if(currText.length > 0) tempPage.text.push(currText);
        currText = "";
        currScene.addPage(tempPage.title, tempPage.text);
        tempPage = {
          "title": line,
          "text": []
        };
      }     
      
    } else if (line.startsWith("# ")) {
      // what to do? can the file have multiple scenes??
    } else if(line.startsWith("!")) {
      const start = line.indexOf("(") + 1;
      const end = line.indexOf(")");
      const imgFileName = line.substring(start, end);
      currScene.addImage(imgFileName);
    } else if (tempPage != undefined && line.length > 0) {
      if (currText.length > 0) currText += "\n";
      currText +=  line;
    } else if(line.length == 0 && currText.length > 0) {
      tempPage.text.push(currText);
      currText = "";
    }
  }
  if(tempPage.title.length > 0) {
    tempPage.text.push(currText);
    currText = "";
    currScene.addPage(tempPage.title, tempPage.text);
  }

  for(let i = 0; i < currScene.images.length; i++) {
    let tempImage = loadImage(currScene.images[i], loadImagesCallback);
  }

  resetTextBoxes();
}

function loadImagesCallback(data) {
  data.loadPixels();
  loadedImages.push(data);

  if(loadedImages.length == currScene.getImageCount()) {
    fileLoaded = true;
    console.log("all images loaded");
    loadImageLayer();
  }
}

function loadPageTextBox() {
  pageTitleTextBox = new TextBox({text: currScene.getPage(currPageIndex).title, font: font, fontSize: defaultFontSize, width: 200, padding: 10, hasShadow: true});
}

function loadTextBoxes() {
  textBoxes = [];
  let tempPage = currScene.getPage(currPageIndex);    
  for(let j = 0; j < tempPage.texts.length; j++) {
    let tempTextBox = new TextBox({text: tempPage.texts[j], font: font, fontSize: defaultFontSize, width: width/4, padding: 10, hasShadow: true});
    textBoxes.push(tempTextBox);
  }
}


function resetTextBoxes() {
  sceneTitleTextBox = new TextBox({text: currScene.title, font: font, fontSize: defaultFontSize, width: 200, padding: 10, hasShadow: true});
  loadPageTextBox();
  loadTextBoxes();
}

function loadImageLayer() {
  imageLayer.clear();
  imageLayer.push();
  imageLayer.translate(-windowWidth/2, -windowHeight/2);
  let lastWidth = 0;
  for(let i = 0; i < loadedImages.length; i++) {
    imageLayer.image(loadedImages[i], lastWidth, 0);
    lastWidth += loadedImages[i].width;
  }
  imageLayer.pop();
}