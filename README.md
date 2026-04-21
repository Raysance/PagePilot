# PagePilot

PagePilot is a browser extension (Edge/Chrome) powered by DeepSeek AI, designed to optimize large-scale tab management through intelligent algorithms.

## Core Features

- **AI Tab Grouping**: Automatically categorizes and groups open tabs using AI.
- **Natural Language Search**: Find and filter tabs by typing what they are about.
- **Multi-Window Support**: Manage and clean up tabs across all open windows.
- **Custom Prompts**: Adjust the AI's classification logic to your needs.
- **Bilingual Support**: Full support for English and Chinese.

## Installation Guide

### 1. Extension Installation
1. Download or clone this repository to your local machine.
2. Navigate to `edge://extensions/` (or `chrome://extensions/`) in your browser.
3. Enable "Developer mode".
4. Click "Load unpacked" and select the project root directory.

### 2. Configuration
This extension requires a DeepSeek API key for AI-powered functionality:
1. Open the extension popup and click the "Settings" icon.
2. Enter a valid **DeepSeek API Key**.
3. Click "Test Connection" to verify API availability.
4. Save the configuration to begin.

### 3. Usage
- **One-Click Organize**: Click the "Organize" button to automatically create and assign tabs to groups based on page content.
- **Smart Filtering**: Enter descriptive text in the search bar, and the AI will identify and filter relevant tabs accordingly.

## Advanced Configuration
In the Options page, users can:
- Toggle interface language.
- Select default grouping strategies.
- **Prompt Customization**: Directly modify system prompts to refine classification accuracy.
- **Debug Mode**: Enable to view detailed categorization logs and API call technicalities.
