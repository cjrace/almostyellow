export const SuitNames = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
export const RankNames = ['Ace', 'King', 'Queen', 'Jack', 'Ten', 'Nine', 'Eight', 'Seven', 'Six', 'Five', 'Four', 'Three', 'Two'];

export type Card = {
    suit: string;
    rank: string;
};

export function getCardName(suit: string, rank: string): string {
    return `${rank} of ${suit}`;
}