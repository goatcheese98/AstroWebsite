import { SignUp } from '@clerk/clerk-react';
import { ClerkWrapper } from './ClerkWrapper';

interface SignupFormProps {
    publishableKey?: string | null;
}

function SignupUnavailable() {
    return (
        <div className="auth-unavailable" role="status">
            Authentication is temporarily unavailable. Please try again in a moment.
        </div>
    );
}

export default function SignupForm({ publishableKey = null }: SignupFormProps) {
    return (
        <ClerkWrapper publishableKey={publishableKey} fallback={<SignupUnavailable />}>
            <SignUp
                path="/signup"
                routing="path"
                signInUrl="/login"
                forceRedirectUrl="/"
            />
        </ClerkWrapper>
    );
}
