import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials, getAvatarUrl, cn } from "@/lib/utils";

interface UserAvatarProps {
    src?: string | null;
    name?: string | null;
    className?: string;
    fallbackClassName?: string;
}

export function UserAvatar({ src, name, className, fallbackClassName }: UserAvatarProps) {
    // Use the name as a seed for consistent random avatars
    const avatarUrl = getAvatarUrl(src, name || 'anonymous');

    return (
        <Avatar className={cn("overflow-hidden shrink-0", className)}>
            <AvatarImage
                src={avatarUrl}
                alt={name || "User Avatar"}
                className="object-cover w-full h-full"
            />
            <AvatarFallback className={cn("bg-secondary font-bold text-white uppercase", fallbackClassName)}>
                {getInitials(name)}
            </AvatarFallback>
        </Avatar>
    );
}
