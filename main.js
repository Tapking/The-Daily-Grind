const {
  app,
  BrowserWindow,
  BrowserView,
  ipcMain,
  dialog,
  shell,
  Notification,
  Menu,
  nativeTheme,
  session
} = require("electron");

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

let mainWindow = null;

const APP_NAME = "LifeDesk";

const DATA_DIR = path.join(
  app.getPath("userData"),
  "lifedesk-data"
);

const BACKUP_DIR = path.join(
  DATA_DIR,
  "backups"
);

const EXPORT_DIR = path.join(
  DATA_DIR,
  "exports"
);

const FILES_DIR = path.join(
  DATA_DIR,
  "files"
);

const SETTINGS_FILE = path.join(
  DATA_DIR,
  "system.json"
);


/* =========================================================
   DIRECTORIES
========================================================= */

function ensureDirectories() {
  [
    DATA_DIR,
    BACKUP_DIR,
    EXPORT_DIR,
    FILES_DIR
  ].forEach(dir => {
    fs.mkdirSync(dir, {
      recursive: true
    });
  });
}


/* =========================================================
   WINDOW
========================================================= */

function createMainWindow() {

  mainWindow = new BrowserWindow({

    width: 1480,
    height: 940,

    minWidth: 1050,
    minHeight: 680,

    title: APP_NAME,

    backgroundColor: "#080b14",

    show: false,

    autoHideMenuBar: true,

    webPreferences: {

      preload: path.join(
        __dirname,
        "preload.js"
      ),

      contextIsolation: true,

      nodeIntegration: false,

      sandbox: false,

      webSecurity: true
    }
  });


  mainWindow.loadFile(
    path.join(
      __dirname,
      "index.html"
    )
  );


  mainWindow.once(
    "ready-to-show",
    () => {

      mainWindow.show();

    }
  );


  mainWindow.on(
    "closed",
    () => {

      mainWindow = null;

    }
  );


  mainWindow.webContents.setWindowOpenHandler(
    ({ url }) => {

      if (
        /^https?:\/\//i.test(url)
      ) {

        shell.openExternal(url);

      }

      return {
        action: "deny"
      };
    }
  );
}


/* =========================================================
   APPLICATION START
========================================================= */

app.whenReady().then(() => {

  ensureDirectories();

  createMainWindow();

  createApplicationMenu();

  setupSecurity();

});


app.on(
  "activate",
  () => {

    if (
      BrowserWindow.getAllWindows()
        .length === 0
    ) {

      createMainWindow();

    }

  }
);


app.on(
  "window-all-closed",
  () => {

    if (
      process.platform !== "darwin"
    ) {

      app.quit();

    }

  }
);


/* =========================================================
   APPLICATION MENU
========================================================= */

function createApplicationMenu() {

  const template = [

    {
      label: "LifeDesk",

      submenu: [

        {
          label: "داشبورد",

          accelerator: "Ctrl+1",

          click() {

            sendToRenderer(
              "navigation:go",
              "dashboard"
            );

          }
        },

        {
          label: "کارها",

          accelerator: "Ctrl+2",

          click() {

            sendToRenderer(
              "navigation:go",
              "tasks"
            );

          }
        },

        {
          label: "تقویم",

          accelerator: "Ctrl+3",

          click() {

            sendToRenderer(
              "navigation:go",
              "calendar"
            );

          }
        },

        {
          type: "separator"
        },

        {
          label: "درباره LifeDesk",

          click() {

            dialog.showMessageBox(
              mainWindow,
              {

                type: "info",

                title:
                  "درباره LifeDesk",

                message:
                  "LifeDesk Desktop",

                detail:
                  `نسخه ${app.getVersion()}\n\n` +
                  "محیط مدیریت شخصی، " +
                  "بهره‌وری، کارها، عادت‌ها، " +
                  "یادداشت‌ها و امور مالی."

              }
            );

          }
        },

        {
          type: "separator"
        },

        {
          role: "quit",

          label: "خروج"
        }

      ]
    },


    {
      label: "ویرایش",

      submenu: [

        {
          role: "undo",
          label: "بازگشت"
        },

        {
          role: "redo",
          label: "انجام دوباره"
        },

        {
          type: "separator"
        },

        {
          role: "cut",
          label: "برش"
        },

        {
          role: "copy",
          label: "کپی"
        },

        {
          role: "paste",
          label: "چسباندن"
        },

        {
          role: "selectAll",
          label: "انتخاب همه"
        }

      ]
    },


    {
      label: "نمایش",

      submenu: [

        {
          role: "reload",
          label: "بازخوانی"
        },

        {
          label: "تمام صفحه",

          accelerator: "F11",

          click() {

            if (mainWindow) {

              mainWindow.setFullScreen(
                !mainWindow.isFullScreen()
              );

            }

          }
        },

        {
          type: "separator"
        },

        {
          role: "resetZoom",
          label: "اندازه اصلی"
        },

        {
          role: "zoomIn",
          label: "بزرگ‌نمایی"
        },

        {
          role: "zoomOut",
          label: "کوچک‌نمایی"
        }

      ]
    },


    {
      label: "ابزارها",

      submenu: [

        {
          label: "ساخت Backup",

          click() {

            sendToRenderer(
              "backup:create-request"
            );

          }
        },

        {
          label: "بازیابی Backup",

          click() {

            sendToRenderer(
              "backup:restore-request"
            );

          }
        },

        {
          type: "separator"
        },

        {
          label: "پوشه اطلاعات",

          click() {

            shell.openPath(
              DATA_DIR
            );

          }
        },

        {
          label: "پوشه Backup",

          click() {

            shell.openPath(
              BACKUP_DIR
            );

          }
        },

        {
          label: "پوشه فایل‌ها",

          click() {

            shell.openPath(
              FILES_DIR
            );

          }
        }

      ]
    },


    {
      label: "پنجره",

      submenu: [

        {
          role: "minimize",
          label: "کوچک کردن"
        },

        {
          role: "close",
          label: "بستن"
        }

      ]
    }

  ];


  Menu.setApplicationMenu(
    Menu.buildFromTemplate(
      template
    )
  );
}


/* =========================================================
   RENDERER MESSAGE
========================================================= */

function sendToRenderer(
  channel,
  data
) {

  if (
    mainWindow &&
    !mainWindow.isDestroyed()
  ) {

    mainWindow.webContents.send(
      channel,
      data
    );

  }
}


/* =========================================================
   APP INFORMATION
========================================================= */

ipcMain.handle(
  "app:get-info",
  () => {

    return {

      name: APP_NAME,

      version:
        app.getVersion(),

      platform:
        process.platform,

      architecture:
        process.arch,

      packaged:
        app.isPackaged,

      electron:
        process.versions.electron,

      chrome:
        process.versions.chrome,

      node:
        process.versions.node,

      userData:
        app.getPath(
          "userData"
        ),

      dataDirectory:
        DATA_DIR

    };

  }
);


/* =========================================================
   PATHS
========================================================= */

ipcMain.handle(
  "paths:get",
  () => {

    return {

      data:
        DATA_DIR,

      backups:
        BACKUP_DIR,

      exports:
        EXPORT_DIR,

      files:
        FILES_DIR

    };

  }
);


/* =========================================================
   WINDOW API
========================================================= */

ipcMain.handle(
  "window:minimize",
  () => {

    if (mainWindow) {

      mainWindow.minimize();

    }

  }
);


ipcMain.handle(
  "window:maximize",
  () => {

    if (!mainWindow) return;

    if (
      mainWindow.isMaximized()
    ) {

      mainWindow.unmaximize();

    } else {

      mainWindow.maximize();

    }

  }
);


ipcMain.handle(
  "window:close",
  () => {

    if (mainWindow) {

      mainWindow.close();

    }

  }
);


ipcMain.handle(
  "window:fullscreen",
  () => {

    if (!mainWindow) return;

    mainWindow.setFullScreen(
      !mainWindow.isFullScreen()
    );

  }
);


ipcMain.handle(
  "window:is-maximized",
  () => {

    return mainWindow
      ? mainWindow.isMaximized()
      : false;

  }
);


/* =========================================================
   THEME
========================================================= */

ipcMain.handle(
  "theme:get",
  () => {

    return nativeTheme.shouldUseDarkColors
      ? "dark"
      : "light";

  }
);


ipcMain.handle(
  "theme:set",
  (_, theme) => {

    if (theme === "dark") {

      nativeTheme.themeSource =
        "dark";

    }

    else if (theme === "light") {

      nativeTheme.themeSource =
        "light";

    }

    else {

      nativeTheme.themeSource =
        "system";

    }

    return nativeTheme.themeSource;

  }
);


/* =========================================================
   NOTIFICATION
========================================================= */

ipcMain.handle(
  "notification:show",
  (_, options = {}) => {

    if (
      !Notification.isSupported()
    ) {

      return {
        success: false,
        reason:
          "not-supported"
      };

    }


    const notification =
      new Notification({

        title:
          options.title ||
          "LifeDesk",

        body:
          options.body ||
          "یادآوری LifeDesk",

        silent:
          Boolean(
            options.silent
          )

      });


    notification.show();


    return {
      success: true
    };

  }
);


/* =========================================================
   EXTERNAL URL
========================================================= */

ipcMain.handle(
  "shell:open-external",
  async (_, url) => {

    if (
      typeof url !== "string"
    ) {

      return false;

    }


    if (
      !/^https?:\/\//i.test(url)
    ) {

      return false;

    }


    await shell.openExternal(
      url
    );


    return true;

  }
);


/* =========================================================
   FILE SELECT
========================================================= */

ipcMain.handle(
  "dialog:open-file",
  async (_, options = {}) => {

    const result =
      await dialog.showOpenDialog(
        mainWindow,
        {

          title:
            options.title ||
            "انتخاب فایل",

          properties:
            options.multiple
              ? [
                  "openFile",
                  "multiSelections"
                ]
              : [
                  "openFile"
                ],

          filters:
            options.filters || []

        }
      );


    if (
      result.canceled
    ) {

      return null;

    }


    return result.filePaths;

  }
);


/* =========================================================
   FOLDER SELECT
========================================================= */

ipcMain.handle(
  "dialog:open-folder",
  async (_, options = {}) => {

    const result =
      await dialog.showOpenDialog(
        mainWindow,
        {

          title:
            options.title ||
            "انتخاب پوشه",

          properties: [
            "openDirectory"
          ]

        }
      );


    if (
      result.canceled
    ) {

      return null;

    }


    return result.filePaths[0] ||
      null;

  }
);


/* =========================================================
   SAVE DIALOG
========================================================= */

ipcMain.handle(
  "dialog:save-file",
  async (_, options = {}) => {

    const result =
      await dialog.showSaveDialog(
        mainWindow,
        {

          title:
            options.title ||
            "ذخیره فایل",

          defaultPath:
            options.defaultPath ||
            "lifedesk-export.json",

          filters:
            options.filters || [
              {
                name:
                  "JSON",
                extensions:
                  ["json"]
              }
            ]

        }
      );


    if (
      result.canceled
    ) {

      return null;

    }


    return result.filePath ||
      null;

  }
);


/* =========================================================
   READ FILE
========================================================= */

ipcMain.handle(
  "file:read",
  async (_, filePath) => {

    if (
      typeof filePath !== "string"
    ) {

      throw new Error(
        "مسیر فایل نامعتبر است."
      );

    }


    return fs.promises.readFile(
      filePath,
      "utf8"
    );

  }
);


/* =========================================================
   WRITE FILE
========================================================= */

ipcMain.handle(
  "file:write",
  async (_, payload) => {

    if (
      !payload ||
      typeof payload.filePath !==
        "string"
    ) {

      throw new Error(
        "مسیر فایل نامعتبر است."
      );

    }


    await fs.promises.writeFile(

      payload.filePath,

      String(
        payload.data ?? ""
      ),

      "utf8"

    );


    return {
      success: true
    };

  }
);


/* =========================================================
   COPY FILE
========================================================= */

ipcMain.handle(
  "file:copy",
  async (_, source, destination) => {

    await fs.promises.copyFile(
      source,
      destination
    );


    return {
      success: true
    };

  }
);


/* =========================================================
   DELETE FILE
========================================================= */

ipcMain.handle(
  "file:delete",
  async (_, filePath) => {

    await fs.promises.rm(
      filePath,
      {
        recursive: true,
        force: true
      }
    );


    return {
      success: true
    };

  }
);


/* =========================================================
   LIST DIRECTORY
========================================================= */

ipcMain.handle(
  "file:list-directory",
  async (_, directory) => {

    const entries =
      await fs.promises.readdir(
        directory,
        {
          withFileTypes: true
        }
      );


    const result = [];


    for (
      const entry of entries
    ) {

      const fullPath =
        path.join(
          directory,
          entry.name
        );


      let stat;

      try {

        stat =
          await fs.promises.stat(
            fullPath
          );

      } catch {

        continue;

      }


      result.push({

        name:
          entry.name,

        path:
          fullPath,

        type:
          entry.isDirectory()
            ? "directory"
            : "file",

        size:
          entry.isDirectory()
            ? 0
            : stat.size,

        modified:
          stat.mtime.toISOString()

      });

    }


    return result;

  }
);


/* =========================================================
   BACKUP
========================================================= */

ipcMain.handle(
  "backup:create",
  async (_, data) => {

    ensureDirectories();


    const stamp =
      new Date()
        .toISOString()
        .replace(
          /[:.]/g,
          "-"
        );


    const file =
      path.join(
        BACKUP_DIR,
        `LifeDesk-${stamp}.json`
      );


    const payload = {

      application:
        APP_NAME,

      version:
        app.getVersion(),

      createdAt:
        new Date()
          .toISOString(),

      checksum:
        createChecksum(data),

      data

    };


    await fs.promises.writeFile(

      file,

      JSON.stringify(
        payload,
        null,
        2
      ),

      "utf8"

    );


    return {

      success: true,

      path:
        file

    };

  }
);


/* =========================================================
   BACKUP RESTORE
========================================================= */

ipcMain.handle(
  "backup:restore",
  async (_, filePath) => {

    const raw =
      await fs.promises.readFile(
        filePath,
        "utf8"
      );


    const parsed =
      JSON.parse(raw);


    if (
      !parsed ||
      typeof parsed !==
        "object" ||
      !("data" in parsed)
    ) {

      throw new Error(
        "Backup معتبر نیست."
      );

    }


    return parsed.data;

  }
);


/* =========================================================
   BACKUP LIST
========================================================= */

ipcMain.handle(
  "backup:list",
  async () => {

    ensureDirectories();


    const names =
      await fs.promises.readdir(
        BACKUP_DIR
      );


    const result = [];


    for (
      const name of names
    ) {

      if (
        !name.endsWith(".json")
      ) {

        continue;

      }


      const file =
        path.join(
          BACKUP_DIR,
          name
        );


      try {

        const stat =
          await fs.promises.stat(
            file
          );


        result.push({

          name,

          path:
            file,

          size:
            stat.size,

          modified:
            stat.mtime.toISOString()

        });

      } catch {}

    }


    return result.sort(
      (a, b) =>
        new Date(
          b.modified
        ) -
        new Date(
          a.modified
        )
    );

  }
);


/* =========================================================
   BACKUP DELETE
========================================================= */

ipcMain.handle(
  "backup:delete",
  async (_, filePath) => {

    await fs.promises.rm(
      filePath,
      {
        force: true
      }
    );


    return true;

  }
);


/* =========================================================
   OPEN BACKUP FOLDER
========================================================= */

ipcMain.handle(
  "backup:open-folder",
  async () => {

    return shell.openPath(
      BACKUP_DIR
    );

  }
);


/* =========================================================
   CHECKSUM
========================================================= */

function createChecksum(data) {

  return crypto
    .createHash("sha256")
    .update(
      JSON.stringify(data)
    )
    .digest("hex");

}


/* =========================================================
   SYSTEM SETTINGS
========================================================= */

ipcMain.handle(
  "system:get-settings",
  async () => {

    ensureDirectories();


    try {

      const raw =
        await fs.promises.readFile(
          SETTINGS_FILE,
          "utf8"
        );


      return JSON.parse(raw);

    } catch {

      return {};

    }

  }
);


ipcMain.handle(
  "system:set-settings",
  async (_, settings) => {

    ensureDirectories();


    await fs.promises.writeFile(

      SETTINGS_FILE,

      JSON.stringify(
        settings || {},
        null,
        2
      ),

      "utf8"

    );


    return true;

  }
);


/* =========================================================
   SECURITY
========================================================= */

function setupSecurity() {

  session.defaultSession.webRequest.onHeadersReceived(
    (details, callback) => {

      callback({

        responseHeaders: {

          ...details.responseHeaders,

          "Content-Security-Policy": [
            "default-src 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: blob:; " +
            "font-src 'self' data:; " +
            "connect-src 'self'"

          ]

        }

      });

    }
  );

}


/* =========================================================
   ERROR HANDLING
========================================================= */

process.on(
  "uncaughtException",
  error => {

    console.error(
      `[${APP_NAME}]`,
      error
    );

  }
);


process.on(
  "unhandledRejection",
  error => {

    console.error(
      `[${APP_NAME}]`,
      error
    );

  }
);