/**
 * Simple logger utility
 */
class Logger {
  info(message, data = {}) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, Object.keys(data).length ? data : '');
  }

  error(message, error = {}) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
  }

  success(message, data = {}) {
    console.log(`[SUCCESS] ${new Date().toISOString()} - ${message}`, Object.keys(data).length ? data : '');
  }

  warn(message, data = {}) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, Object.keys(data).length ? data : '');
  }
}

export default new Logger();

