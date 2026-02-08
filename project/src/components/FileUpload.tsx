import React, { useState } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const excelFile = files.find(file => 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel'
    );
    
    if (excelFile) {
      setSelectedFile(excelFile);
      onFileSelect(excelFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Import de Campagne</h3>
      
      {!selectedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
            isDragOver
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-600 hover:border-slate-500'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <p className="text-white font-medium mb-2">
            Glissez-déposez votre fichier Excel ici
          </p>
          <p className="text-slate-400 text-sm mb-4">
            ou cliquez pour sélectionner un fichier
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Sélectionner un fichier
          </label>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
          <div className="flex items-center">
            <FileSpreadsheet className="h-8 w-8 text-green-400 mr-3" />
            <div>
              <p className="text-white font-medium">{selectedFile.name}</p>
              <p className="text-slate-400 text-sm">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={removeFile}
            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;