import { SignIn } from '@clerk/clerk-react';
import { ClerkWrapper } from './ClerkWrapper';

interface LoginFormProps {
    publishableKey?: string | null;
}

function LoginUnavailable() {
    return (
        <div className="auth-unavailable" role="status">
            Authentication is temporarily unavailable. Please try again in a moment.
        </div>
    );
}

export default function LoginForm({ publishableKey = null }: LoginFormProps) {
    return (
        <ClerkWrapper publishableKey={publishableKey} fallback={<LoginUnavailable />}>
            <SignIn
                path="/login"
                routing="path"
                signUpUrl="/signup"
                forceRedirectUrl="/"
            />
        </ClerkWrapper>
    );
}
