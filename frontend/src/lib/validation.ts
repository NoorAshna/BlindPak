export const emailValidation = {
    required: 'Email is required',
    pattern: {
        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: 'Enter a valid email address',
    },
};

export const passwordValidation = {
    required: 'Password is required',
    minLength: {
        value: 8,
        message: 'Password must be at least 8 characters',
    },
    maxLength: {
        value: 128,
        message: 'Password must not exceed 128 characters',
    },
    pattern: {
        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])\S+$/,
        message: 'Use uppercase, lowercase, number, and special character',
    },
};
