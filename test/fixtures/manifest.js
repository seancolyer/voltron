module.exports = {
  "manifest_version": 2,

  "name": "DriveExtension Test",
  "description": "Drive Extension Test",
  "version": "1.0",
  "homepage_url": "https://www.virtru.com",
  "icons": {
    "128": "icons/icon-128.png",
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png"
  },
  "browser_action": {
    "default_icon": {
      "19": "icons/browser-action-19.png",
      "38": "icons/browser-action-38.png"
    },
    "default_popup": "popup.html",
    "default_title": "Virtru"
  },
  "permissions": [
    "something",
    "tabs",
    "storage",
    "https://*/",
    "http://*/"
  ],
  "content_scripts": [
    {
      "css": [
        "css/virtru-child-extension.css"
      ],
      "js": [
        "js/virtru-child-content.js"
      ],
      "matches": [
        "http://drive.google.com/*",
        "https://drive.google.com/*"
      ]
    }
  ],
  "web_accessible_resources": [
    "js/*",
    "css/*",
    "img/*"
  ]
};
