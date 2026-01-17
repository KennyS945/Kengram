import { useCallback, useState } from "react";
import { FileWithPath, useDropzone } from "react-dropzone";

import { Button } from "@/components/ui";
import { convertFileToUrl } from "@/lib/utils";

type FileUploaderProps = {
  fieldChange: (files: File[]) => void;
  mediaUrl: string;
};

const FileUploader = ({ fieldChange, mediaUrl }: FileUploaderProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [fileUrls, setFileUrls] = useState<string[]>(mediaUrl ? [mediaUrl] : []);

  const onDrop = useCallback(
    (acceptedFiles: FileWithPath[]) => {
      // Append new files to existing ones (not replace)
      if (files.length + acceptedFiles.length > 10) {
        // Limit total to 10 files
        const remaining = 10 - files.length;
        const newFiles = acceptedFiles.slice(0, remaining);
        const updatedFiles = [...files, ...newFiles];
        setFiles(updatedFiles);
        fieldChange(updatedFiles);
        
        const newUrls = newFiles.map(file => convertFileToUrl(file));
        setFileUrls([...fileUrls, ...newUrls]);
      } else {
        const updatedFiles = [...files, ...acceptedFiles];
        setFiles(updatedFiles);
        fieldChange(updatedFiles);
        
        const newUrls = acceptedFiles.map(file => convertFileToUrl(file));
        setFileUrls([...fileUrls, ...newUrls]);
      }
    },
    [files, fileUrls]
  );

  const handleRemoveImage = (indexToRemove: number) => {
    const updatedFiles = files.filter((_, idx) => idx !== indexToRemove);
    const updatedUrls = fileUrls.filter((_, idx) => idx !== indexToRemove);
    
    setFiles(updatedFiles);
    setFileUrls(updatedUrls);
    fieldChange(updatedFiles);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpeg", ".jpg"],
    },
    multiple: true,
  });

  return (
    <div className="flex flex-col gap-4">
      <div
        {...getRootProps()}
        className="flex flex-center flex-col bg-dark-3 rounded-xl cursor-pointer">
        <input {...getInputProps()} className="cursor-pointer" multiple />

        {fileUrls.length > 0 ? (
          <>
            <div className="flex flex-wrap gap-4 w-full p-5 lg:p-10">
              {fileUrls.map((url, idx) => (
                <div key={idx} className="relative">
                  <img 
                    src={url} 
                    alt={`image-${idx}`} 
                    className="file_uploader-img h-32 w-32 object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition"
                    title="Remove image"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <p className="file_uploader-label">Click or drag photos to add more (max 10, {fileUrls.length}/10)</p>
          </>
        ) : (
          <div className="file_uploader-box ">
            <img
              src="/assets/icons/file-upload.svg"
              width={96}
              height={77}
              alt="file upload"
            />

            <h3 className="base-medium text-light-2 mb-2 mt-6">
              Drag photos here
            </h3>
            <p className="text-light-4 small-regular mb-6">SVG, PNG, JPG (up to 10 photos)</p>

            <Button type="button" className="shad-button_dark_4">
              Select from computer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
