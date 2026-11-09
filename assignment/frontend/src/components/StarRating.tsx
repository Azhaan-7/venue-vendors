import { HStack, Text } from "@chakra-ui/react";

type StarRatingProps = {
    rating: number | null;
};

export function StarRating({rating}: StarRatingProps) {
    if (rating === null) {
        return <Text fontSize="sm" color="gray.600">No rating</Text>
    }
    return (
        <HStack spacing={1} role="img" aria-label={`Rating ${rating} out of 5`}>
            {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill={star <= rating ? "currentColor" : "none"} stroke="currentColor" style={{ color: "var(--chakra-colors-gray-600)" }}>
                    <path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1.1 6.2L12 17.3l-5.7 2.9 1.1-6.2-4.5-4.4 6.3-.9Z" />
                </svg>
            ))}
        </HStack>
    );
}
