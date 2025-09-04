import { useState, useCallback } from 'react';
import { loadTesseract, loadXLSX, withDynamicImport } from '../dynamicImports';

// Hook for managing heavy library loading states
export const useHeavyLibraries = () => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setLoading = useCallback((library: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [library]: loading }));
  }, []);

  const setError = useCallback((library: string, error: string | null) => {
    setErrors(prev => ({ ...prev, [library]: error || '' }));
  }, []);

  // OCR processing with dynamic import
  const processOCR = useCallback(async (imageFile: File) => {
    setLoading('tesseract', true);
    setError('tesseract', null);
    
    try {
      const createWorker = await loadTesseract();
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(imageFile);
      await worker.terminate();
      return text;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'OCR processing failed';
      setError('tesseract', errorMsg);
      throw error;
    } finally {
      setLoading('tesseract', false);
    }
  }, [setLoading, setError]);

  // Excel processing with dynamic import
  const processExcel = useCallback(async (file: File) => {
    setLoading('xlsx', true);
    setError('xlsx', null);
    
    try {
      const XLSX = await loadXLSX();
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      return data;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Excel processing failed';
      setError('xlsx', errorMsg);
      throw error;
    } finally {
      setLoading('xlsx', false);
    }
  }, [setLoading, setError]);

  return {
    loadingStates,
    errors,
    processOCR,
    processExcel,
    isLoading: (library: string) => loadingStates[library] || false,
    getError: (library: string) => errors[library] || null
  };
};
