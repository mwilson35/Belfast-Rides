import React, { useState } from 'react';
import api from '../services/api';

const DocumentUpload = ({ documentType }) => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file.");
      return;
    }
    const formData = new FormData();
    formData.append('document', file);
    formData.append('documentType', documentType);

    try {
      const response = await api.post('/documents/uploadDocument', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage(response.data.message);
    } catch (error) {
      console.error(error);
      setMessage("Upload failed.");
    }
  };

  return (
    <div className="document-upload card p-3 mb-3">
      <h3 className="card-title mb-3">Upload {documentType}</h3>
      <div className="mb-3">
        <input 
          type="file" 
          onChange={handleFileChange} 
          className="form-control" 
        />
      </div>
      <button onClick={handleUpload} className="btn btn-primary">
        Upload
      </button>
      {message && (
        <div className="mt-3 alert alert-info" role="alert">
          {message}
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
