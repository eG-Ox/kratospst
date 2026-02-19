import React from 'react';

const CHUNK_RELOAD_FLAG = 'kratos_chunk_reload_once';

const isChunkLoadError = (error) => {
  const message = String(error?.message || '');
  const name = String(error?.name || '');
  return (
    name === 'ChunkLoadError' ||
    /chunk/i.test(message) ||
    /Loading CSS chunk/i.test(message) ||
    /Loading chunk [0-9]+ failed/i.test(message) ||
    /Failed to fetch dynamically imported module/i.test(message)
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (typeof window !== 'undefined' && isChunkLoadError(error)) {
      const attempted = window.sessionStorage.getItem(CHUNK_RELOAD_FLAG);
      if (!attempted) {
        window.sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1');
        window.location.reload();
        return;
      }
    }

    if (typeof this.props.onError === 'function') {
      this.props.onError(error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__card">
            <h2>Ocurrió un error inesperado</h2>
            <p>Recarga la página o vuelve a iniciar sesión.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
