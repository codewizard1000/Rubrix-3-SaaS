export interface ToastProps {
    error?: string;
    success?: string;
    info?: string;
    onClose?: () => void;
}