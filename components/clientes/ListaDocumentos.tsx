// components/clientes/ListaDocumentos.tsx
import { FileText, Download, Trash2, Eye, Calendar, File, FileImage } from "lucide-react";
import { useState } from "react";
import VisualizarDocumento from "./VisualizarDocumento";

interface Documento {
  id: number;
  document_file: string;
  file_name?: string;
  file_type?: string;
  file_size?: number;
  created_at: string;
}

interface ListaDocumentosProps {
  documentos: Documento[];
  onDelete?: (id: number) => void;
  onDownload?: (doc: Documento) => void;
  podeDeletar?: boolean;
}

export default function ListaDocumentos({ 
  documentos, 
  onDelete, 
  onDownload,
  podeDeletar = true 
}: ListaDocumentosProps) {
  const [documentoSelecionado, setDocumentoSelecionado] = useState<Documento | null>(null);
  const [visualizarAberto, setVisualizarAberto] = useState(false);

  const getFileIcon = (doc: Documento) => {
    const type = doc.file_type || '';
    if (type.includes('pdf')) return <FileText size={20} className="text-red-500" />;
    if (type.includes('image')) return <FileImage size={20} className="text-blue-500" />;
    return <File size={20} className="text-zinc-500" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Desconhecido';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleVisualizar = (doc: Documento) => {
    setDocumentoSelecionado(doc);
    setVisualizarAberto(true);
  };

  const handleDownload = (doc: Documento) => {
    if (onDownload) {
      onDownload(doc);
    } else {
      const link = document.createElement('a');
      link.href = doc.document_file;
      link.download = doc.file_name || `documento-${doc.id}.bin`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (documentos.length === 0) {
    return (
      <div className="text-center py-8 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
        <FileText size={32} className="text-zinc-300 mx-auto mb-2" />
        <p className="text-xs text-zinc-400">Nenhum documento anexado</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {documentos.map((doc) => (
          <div 
            key={doc.id}
            className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200 hover:border-indigo-200 transition-all group"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {getFileIcon(doc)}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-800 truncate">
                  {doc.file_name || `Documento ${doc.id}`}
                </p>
                <div className="flex items-center gap-2 text-[9px] text-zinc-400 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar size={8} />
                    {formatDate(doc.created_at)}
                  </span>
                  <span>•</span>
                  <span>{formatFileSize(doc.file_size)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleVisualizar(doc)}
                className="p-1.5 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Visualizar"
              >
                <Eye size={14} />
              </button>
              <button
                onClick={() => handleDownload(doc)}
                className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                title="Download"
              >
                <Download size={14} />
              </button>
              {podeDeletar && onDelete && (
                <button
                  onClick={() => onDelete(doc.id)}
                  className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Excluir"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <VisualizarDocumento
        aberto={visualizarAberto}
        documento={documentoSelecionado}
        onClose={() => {
          setVisualizarAberto(false);
          setDocumentoSelecionado(null);
        }}
      />
    </>
  );
}