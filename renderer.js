const { ipcRenderer } = require('electron');
const path = require('path');

const selectVideoBtn = document.getElementById('selectVideo');
const selectDirectoryBtn = document.getElementById('selectDirectory');
const videoContainer = document.getElementById('videoContainer');
const videoPlayer = document.getElementById('videoPlayer');
const captureFrameBtn = document.getElementById('captureFrame');
const currentTimeDisplay = document.getElementById('currentTime');
const statusMessage = document.getElementById('statusMessage');
const capturedFrames = document.getElementById('capturedFrames');
const framesList = document.getElementById('framesList');
const backHalfSecondBtn = document.getElementById('backHalfSecond');
const forwardHalfSecondBtn = document.getElementById('forwardHalfSecond');
const backOneSecondBtn = document.getElementById('backOneSecond');
const forwardOneSecondBtn = document.getElementById('forwardOneSecond');

const infoDisplay = document.getElementById('infoDisplay');
const videoPathDisplay = document.getElementById('videoPathDisplay');
const directoryPathDisplay = document.getElementById('directoryPathDisplay');

let currentVideoPath = null;
let saveDirectory = null;
let capturedFramesCount = 0;

// Format seconds into MM:SS format
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

videoPlayer.addEventListener('timeupdate', () => {
  currentTimeDisplay.textContent = formatTime(videoPlayer.currentTime);
});

function showStatusMessage(message, type) {
  // Clear any existing timeout
  if (window.statusFadeTimeout) {
    clearTimeout(window.statusFadeTimeout);
    statusMessage.classList.remove('fade-out');
  }
  
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;
  
  // If it's a success message, set it to fade out after 3 seconds
  if (type === 'success') {
    window.statusFadeTimeout = setTimeout(() => {
      statusMessage.classList.add('fade-out');
      
      // Clear the message after the fade completes
      setTimeout(() => {
        if (statusMessage.classList.contains('fade-out')) {
          statusMessage.textContent = '';
          statusMessage.className = 'status';
        }
      }, 500);
    }, 2500); // Show for 2.5 seconds before fading
  }
}

// Select video file
selectVideoBtn.addEventListener('click', async () => {
  try {
    const videoPath = await ipcRenderer.invoke('select-video');
    if (!videoPath) return;
    
    currentVideoPath = videoPath;
    videoPlayer.src = `file://${videoPath}`;
    videoContainer.classList.remove('hidden');
    
    videoPathDisplay.textContent = videoPath;
    infoDisplay.classList.remove('hidden');
    
    showStatusMessage(`Video loaded: ${path.basename(videoPath)}`, 'success');
  } catch (error) {
    showStatusMessage(`Error loading video: ${error.message}`, 'error');
  }
});

// Select save directory
selectDirectoryBtn.addEventListener('click', async () => {
  try {
    const dirPath = await ipcRenderer.invoke('select-directory');
    if (!dirPath) return;
    
    saveDirectory = dirPath;
    
    directoryPathDisplay.textContent = dirPath;
    infoDisplay.classList.remove('hidden');
    
    showStatusMessage(`Save directory set: ${dirPath}`, 'success');
  } catch (error) {
    showStatusMessage(`Error selecting directory: ${error.message}`, 'error');
  }
});

// Capture current frame
captureFrameBtn.addEventListener('click', async () => {
  if (!currentVideoPath) {
    showStatusMessage('Please select a video first', 'error');
    return;
  }
  
  try {
    const timestamp = videoPlayer.currentTime;
    const filename = `frame-${Date.now()}.jpg`;
    
    showStatusMessage('Capturing frame...', '');
    
    const outputPath = await ipcRenderer.invoke('extract-frame', {
      videoPath: currentVideoPath,
      timestamp,
      outputDir: saveDirectory,
      filename
    });
    
    showStatusMessage(`Frame saved to: ${outputPath}`, 'success');
    
    addCapturedFrame(outputPath, timestamp);
  } catch (error) {
    showStatusMessage(`Error capturing frame: ${error}`, 'error');
  }
});

// Add a captured frame to the list
function addCapturedFrame(imagePath, timestamp) {
  capturedFramesCount++;
  
  if (capturedFramesCount === 1) capturedFrames.classList.remove('hidden');
  
  const frameItem = document.createElement('div');
  frameItem.className = 'frame-item';
  frameItem.dataset.path = imagePath;
  
  frameItem.innerHTML = `
    <img src="file://${imagePath}" alt="Captured frame">
    <div class="frame-info">
      <p>Time: ${formatTime(timestamp)}</p>
      <p>Path: ${imagePath}</p>
      <div class="frame-actions">
        <button class="btn view-btn">View</button>
        <button class="btn delete-btn">Delete</button>
      </div>
    </div>
  `;
  
  const viewBtn = frameItem.querySelector('.view-btn');
  const deleteBtn = frameItem.querySelector('.delete-btn');
  
  viewBtn.addEventListener('click', () => {
    ipcRenderer.invoke('open-file', imagePath);
  });
  
  deleteBtn.addEventListener('click', async () => {
    try {
      await ipcRenderer.invoke('delete-file', imagePath);
      frameItem.remove();
      showStatusMessage(`Image deleted: ${path.basename(imagePath)}`, 'success');
      
      if (framesList.children.length === 0) {
        capturedFrames.classList.add('hidden');
        capturedFramesCount = 0;
      }
    } catch (error) {
      showStatusMessage(`Error deleting image: ${error}`, 'error');
    }
  });
  
  if (framesList.firstChild) framesList.insertBefore(frameItem, framesList.firstChild);
  else framesList.appendChild(frameItem);
}

// Navigation controls - move back 0.1 seconds
backHalfSecondBtn.addEventListener('click', () => {
  if (!videoPlayer.paused) videoPlayer.pause();
  videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 0.1);
});

// Navigation controls - move forward 0.1 seconds
forwardHalfSecondBtn.addEventListener('click', () => {
  if (!videoPlayer.paused) videoPlayer.pause();
  videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 0.1);
});

// Navigation controls - move back 1 second
backOneSecondBtn.addEventListener('click', () => {
  if (!videoPlayer.paused) videoPlayer.pause();
  videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 1.0);
});

// Navigation controls - move forward 1 second
forwardOneSecondBtn.addEventListener('click', () => {
  if (!videoPlayer.paused) videoPlayer.pause();
  videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 1.0);
});