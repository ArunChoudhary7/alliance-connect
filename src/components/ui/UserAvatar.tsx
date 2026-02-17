import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, getAvatarUrl, cn } from "@/lib/utils";

interface UserAvatarProps {
    src?: string | null;
    name?: string | null;
    className?: string;
    fallbackClassName?: string;
}

export function UserAvatar({ src, name, className, fallbackClassName }: UserAvatarProps) {
    const [imageError, setImageError] = useState(false);

    // Reset error state when src changes
    useEffect(() => {
        setImageError(false);
    }, [src]);

    // Primary: Custom or Generated (if src is missing)
    const avatarUrl = getAvatarUrl(src, name || 'anonymous');

    // Backup: Always Generated (for when custom fails)
    const backupUrl = getAvatarUrl(null, name || 'anonymous');

    // If the primary IS the backup (because src was empty), we don't need a secondary fallback image
    const isCustom = avatarUrl !== backupUrl;

    return (
        <Avatar className={cn("overflow-hidden shrink-0", className)}>
            <AvatarImage
                src={avatarUrl as string}
                alt={name || "User Avatar"}
                className="object-cover w-full h-full"
            />
            <AvatarFallback className={cn("bg-secondary font-bold text-white uppercase flex items-center justify-center overflow-hidden", fallbackClassName)}>
                {isCustom && !imageError ? (
                    <img
                        src={backupUrl as string}
                        alt={name || "Fallback"}
                        className="h-full w-full object-cover"
                        onError={() => setImageError(true)}
                    />
                ) : (
                    getInitials(name)
                )}
            </AvatarFallback>
        </Avatar>
    );
}
