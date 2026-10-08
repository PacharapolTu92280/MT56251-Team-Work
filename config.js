// Replace values after Entra ID app registration and shared OneDrive folder setup.
window.MT_CONFIG = {
  clientId: 'REPLACE_WITH_ENTRA_APPLICATION_CLIENT_ID',
  tenantId: 'REPLACE_WITH_TENANT_ID',
  // A folder shared with all users; the signed-in user must have edit permission.
  // Use the OWNER's drive ID and the shared folder item ID.
  driveId: 'REPLACE_WITH_OWNER_DRIVE_ID',
  folderItemId: 'REPLACE_WITH_SHARED_FOLDER_ITEM_ID',
  adminEmails: ['replace-admin@company.example'],
  fileName: 'mt56251-tasks.json'
};
