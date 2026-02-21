import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: "primary" | "icon" | "danger" | "ghost";
    className?: string;
}

export function Button({ children, variant = "primary", className = "", ...props }: ButtonProps) {
    const baseStyles = "transition-colors cursor-pointer font-medium border disabled:opacity-50 disabled:cursor-not-allowed";

    let variantStyles = "";
    if (variant === "primary") {
        variantStyles = "px-4 py-2 bg-primary text-white border-primary hover:bg-white hover:text-primary dark:bg-white dark:text-primary dark:border-white dark:hover:bg-primary dark:hover:text-white";
    } else if (variant === "icon") {
        variantStyles = "px-3 py-2 border-primary hover:bg-primary hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-primary inline-flex items-center gap-1";
    } else if (variant === "danger") {
        variantStyles = "px-2 py-1 bg-red-500 text-white border-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-xs";
    } else if (variant === "ghost") {
        variantStyles = "py-1 px-2 bg-primary text-white border-primary hover:bg-white hover:text-primary dark:bg-white dark:text-primary dark:border-white dark:hover:bg-primary dark:hover:text-white text-sm";
    }

    return (
        <button className={`${baseStyles} ${variantStyles} ${className}`} {...props}>
            {children}
        </button>
    );
}
