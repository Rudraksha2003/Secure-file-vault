import { register, login, logout, requestPasswordReset } from './auth.js'
import { createNote, loadNote, downloadNoteAsText, copyShareLink } from './notes.js'
import { uploadFile, loadFileList, loadCollaborativeNotes, submitFilePassword, viewFile, downloadFile, deleteFile, copyDownloadLink, downloadCollaborativeNote, deleteCollaborativeNote } from './files.js'

// expose auth
window.register = register
window.login = login
window.logout = logout
window.requestPasswordReset = requestPasswordReset

// expose notes
window.createNote = createNote
window.loadNote = loadNote
window.downloadNoteAsText = downloadNoteAsText
window.copyShareLink = copyShareLink

// expose upload & my files
window.uploadFile = uploadFile
window.loadFileList = loadFileList
window.submitFilePassword = submitFilePassword
window.viewFile = viewFile
window.downloadFile = downloadFile
window.deleteFile = deleteFile
window.copyDownloadLink = copyDownloadLink
window.downloadCollaborativeNote = downloadCollaborativeNote
window.deleteCollaborativeNote = deleteCollaborativeNote

// load file list and collaborative notes when on My Files page
if (document.getElementById('fileList')) {
  loadFileList()
}
if (document.getElementById('collabNotesList')) {
  loadCollaborativeNotes()
}