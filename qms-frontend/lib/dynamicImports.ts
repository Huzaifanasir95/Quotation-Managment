// Dynamic import utilities for heavy libraries to enable code splitting

// Tesseract.js for OCR processing - only load when needed
export const loadTesseract = async () => {
  const { createWorker } = await import('tesseract.js');
  return createWorker;
};

// XLSX library for Excel processing - only load when needed
export const loadXLSX = async () => {
  const XLSX = await import('xlsx');
  return XLSX;
};

// Future libraries can be added here when needed
// Example implementations for when these libraries are installed:

// Chart.js - only load when needed (commented out until installed)
// export const loadChartJS = async () => {
//   try {
//     const Chart = await import('chart.js/auto');
//     return Chart.default;
//   } catch (error) {
//     console.warn('Chart.js not available:', error);
//     return null;
//   }
// };

// PDF processing libraries - only load when needed (commented out until installed)
// export const loadPDFJS = async () => {
//   try {
//     const pdfjs = await import('pdfjs-dist');
//     return pdfjs;
//   } catch (error) {
//     console.warn('PDF.js not available:', error);
//     return null;
//   }
// };

// Date processing libraries - only load when needed (commented out until installed)
// export const loadDateFns = async () => {
//   try {
//     const dateFns = await import('date-fns');
//     return dateFns;
//   } catch (error) {
//     console.warn('date-fns not available:', error);
//     return null;
//   }
// };

// Utility function to create a loading wrapper for heavy operations
export const withDynamicImport = <T extends any[], R>(
  importFn: () => Promise<any>,
  operation: (lib: any, ...args: T) => R | Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    const lib = await importFn();
    return operation(lib, ...args);
  };
};

// Example usage:
// const processExcel = withDynamicImport(loadXLSX, (XLSX, file) => {
//   return XLSX.read(file, { type: 'buffer' });
// });
