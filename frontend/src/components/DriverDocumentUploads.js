
import React, { useState } from 'react';
import DocumentUpload from './DocumentUpload';

const DriverDocumentUploads = () => {
  const [activeType, setActiveType] = useState(null);

  const documentTypes = [
    { type: 'profilePhoto', label: 'Profile Photo' },
    { type: 'driversLicense', label: "Driver's License" },
    { type: 'insuranceDocument', label: 'Insurance Document' },
    { type: 'taxiDocument', label: 'Taxi Document' }
  ];

  return (
    <div className="driver-document-uploads">
      <h2>Upload Your Documents</h2>
      <div className="document-buttons">
        {documentTypes.map((doc) => (
          <button 
            key={doc.type}
            className="btn btn-outline-primary m-2"
            onClick={() => setActiveType(doc.type)}
          >
            {doc.label}
          </button>
        ))}
      </div>
      {activeType && (
        <div className="document-upload-container mt-3">
          <DocumentUpload documentType={activeType} />
        </div>
      )}
    </div>
  );
};

export default DriverDocumentUploads;
