// components/clientes/VisualizarDocumento.tsx
import { X, FileText, Download, File, FileImage, Calendar } from "lucide-react";
import { useState } from "react";

interface VisualizarDocumentoProps {
  aberto: boolean;
  documento: {
    id: number;
    document_file: string;
    file_name?: string;
    file_type?: string;
    file_size?: number;
    created_at?: string;
  } | null;
  onClose: () => void;
}

export default function VisualizarDocumento({ aberto, documento, onClose }: VisualizarDocumentoProps) {
  const [carregando, setCarregando] = useState(false);

  if (!aberto || !documento) return null;

  const isPDF = documento.file_type?.includes('pdf') || 
                documento.document_file?.includes('%PDF');
  
  const isImage = documento.file_type?.includes('image') || 
                  documento.document_file?.startsWith('data:image');

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Desconhecido';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date?: string) => {
    if (!date) return 'Data desconhecida';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = () => {
    try {
      setCarregando(true);
      const link = document.createElement('a');
      link.href = documento.document_file;
      link.download = documento.file_name || `documento-${documento.id}.bin`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Erro ao baixar documento:", error);
      alert("Erro ao baixar documento");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl flex flex-col border border-zinc-200 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
          <div className="flex items-center gap-2">
            <FileText size={20} className="text-indigo-600" />
            <h2 className="text-lg font-bold text-zinc-900">Detalhes do Documento</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Informações do Documento */}
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl">
            {isPDF ? (
              <FileText size={40} className="text-red-600" />
            ) : isImage ? (
              <FileImage size={40} className="text-blue-600" />
            ) : (
              <File size={40} className="text-zinc-600" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-zinc-800 truncate">
                {documento.file_name || `Documento ${documento.id}`}
              </p>
              <p className="text-xs text-zinc-500">
                {isPDF ? 'PDF' : isImage ? 'Imagem' : 'Arquivo'}
              </p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-zinc-100">
              <span className="text-zinc-500">Data de upload:</span>
              <span className="font-medium text-zinc-800">{formatDate(documento.created_at)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-100">
              <span className="text-zinc-500">Tamanho:</span>
              <span className="font-medium text-zinc-800">{formatFileSize(documento.file_size)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-zinc-500">Tipo:</span>
              <span className="font-medium text-zinc-800">{documento.file_type || 'Desconhecido'}</span>
            </div>
          </div>

          {isImage && (
            <div className="mt-4 p-2 bg-zinc-100 rounded-lg">
              <img 
                src={documento.document_file} 
                alt="Preview" 
                className="max-w-full max-h-40 mx-auto object-contain rounded"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-3">
          <button
            onClick={handleDownload}
            disabled={carregando}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={16} />
            {carregando ? "Baixando..." : "Download"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-50"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}