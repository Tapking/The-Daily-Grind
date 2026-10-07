const {
  contextBridge,
  ipcRenderer
} = require("electron");

/*
  LifeDesk Secure Bridge

  Renderer هیچ دسترسی مستقیمی به Node.js ندارد.
  تمام ارتباطات از این API عبور می‌کند.
*/

const api = {

  /* =========================
     APP
  ========================= */

  app: {

    getInfo: () =>
      ipcRenderer.invoke(
        "app:get-info"
      )

  },


  /* =========================
     PATHS
  ========================= */

  paths: {

    get: () =>
      ipcRenderer.invoke(
        "paths:get"
      )

  },


  /* =========================
     WINDOW
  ========================= */

  window: {

    minimize: () =>
      ipcRenderer.invoke(
        "window:minimize"
      ),

    maximize: () =>
      ipcRenderer.invoke(
        "window:maximize"
      ),

    close: () =>
      ipcRenderer.invoke(
        "window:close"
      ),

    fullscreen: () =>
      ipcRenderer.invoke(
        "window:fullscreen"
      ),

    isMaximized: () =>
      ipcRenderer.invoke(
        "window:is-maximized"
      )

  },


  /* =========================
     THEME
  ========================= */

  theme: {

    get: () =>
      ipcRenderer.invoke(
        "theme:get"
      ),

    set: theme =>
      ipcRenderer.invoke(
        "theme:set",
        theme
      )

  },


  /* =========================
     NOTIFICATIONS
  ========================= */

  notifications: {

    show: options =>
      ipcRenderer.invoke(
        "notification:show",
        options
      )

  },


  /* =========================
     EXTERNAL LINKS
  ========================= */

  shell: {

    openExternal: url =>
      ipcRenderer.invoke(
        "shell:open-external",
        url
      )

  },


  /* =========================
     DIALOGS
  ========================= */

  dialog: {

    openFile: options =>
      ipcRenderer.invoke(
        "dialog:open-file",
        options || {}
      ),

    openFolder: options =>
      ipcRenderer.invoke(
        "dialog:open-folder",
        options || {}
      ),

    saveFile: options =>
      ipcRenderer.invoke(
        "dialog:save-file",
        options || {}
      )

  },


  /* =========================
     FILE SYSTEM
  ========================= */

  files: {

    read: filePath =>
      ipcRenderer.invoke(
        "file:read",
        filePath
      ),

    write: (
      filePath,
      data
    ) =>
      ipcRenderer.invoke(
        "file:write",
        {
          filePath,
          data
        }
      ),

    copy: (
      source,
      destination
    ) =>
      ipcRenderer.invoke(
        "file:copy",
        source,
        destination
      ),

    delete: filePath =>
      ipcRenderer.invoke(
        "file:delete",
        filePath
      ),

    listDirectory: directory =>
      ipcRenderer.invoke(
        "file:list-directory",
        directory
      )

  },


  /* =========================
     BACKUP
  ========================= */

  backup: {

    create: data =>
      ipcRenderer.invoke(
        "backup:create",
        data
      ),

    restore: filePath =>
      ipcRenderer.invoke(
        "backup:restore",
        filePath
      ),

    list: () =>
      ipcRenderer.invoke(
        "backup:list"
      ),

    delete: filePath =>
      ipcRenderer.invoke(
        "backup:delete",
        filePath
      ),

    openFolder: () =>
      ipcRenderer.invoke(
        "backup:open-folder"
      )

  },


  /* =========================
     SYSTEM SETTINGS
  ========================= */

  system: {

    getSettings: () =>
      ipcRenderer.invoke(
        "system:get-settings"
      ),

    setSettings: settings =>
      ipcRenderer.invoke(
        "system:set-settings",
        settings
      )

  },


  /* =========================
     EVENTS
  ========================= */

  events: {

    onNavigation: callback => {

      const listener =
        (_, page) => {

          callback(page);

        };

      ipcRenderer.on(
        "navigation:go",
        listener
      );

      return () => {

        ipcRenderer.removeListener(
          "navigation:go",
          listener
        );

      };

    },


    onBackupCreateRequest:
      callback => {

        const listener =
          () => callback();

        ipcRenderer.on(
          "backup:create-request",
          listener
        );

        return () => {

          ipcRenderer.removeListener(
            "backup:create-request",
            listener
          );

        };

      },


    onBackupRestoreRequest:
      callback => {

        const listener =
          () => callback();

        ipcRenderer.on(
          "backup:restore-request",
          listener
        );

        return () => {

          ipcRenderer.removeListener(
            "backup:restore-request",
            listener
          );

        };

      }

  }

};


/*
  فقط APIهای مشخص‌شده در اختیار صفحه قرار می‌گیرند.
*/
contextBridge.exposeInMainWorld(
  "lifeDesk",
  api
);