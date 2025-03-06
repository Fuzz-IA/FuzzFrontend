// Champion variables that can be changed
export const CHAMPION1 = 'putin';
export const CHAMPION2 = 'zelensky';
export const CHAMPION1_NAME = 'Putin';
export const CHAMPION2_NAME = 'Zelensky';
export const CHAMPION1_AVATAR = '/putin.jpeg';
export const CHAMPION2_AVATAR = '/zelensky.jpg';

// Agent IDs
export const AGENT_IDS = {
    AGENT1_ID: 'e0e10e6f-ff2b-0d4c-8011-1fc1eee7cb32', // champion1
    AGENT2_ID: '94bfebec-fb1a-02b3-a54d-a1f15b5668a5',  // champion2
    AGENT3_ID: 'd1c10fb0-e672-079e-b9cf-a1c8cdc32b96'  // Fuzz
} as const;

// Agent information
export const AGENTS_INFO = {
    [AGENT_IDS.AGENT1_ID]: {
        name: CHAMPION1_NAME,
        color: 'bg-orange-500',
        initials: 'VP',
        avatar: CHAMPION1_AVATAR,
        side: CHAMPION1
    },
    [AGENT_IDS.AGENT2_ID]: {
        name: CHAMPION2_NAME,
        color: 'bg-red-500',
        initials: 'VZ',
        avatar: CHAMPION2_AVATAR,
        side: CHAMPION2
    },
    [AGENT_IDS.AGENT3_ID]: {
        name: 'Fuzz',
        color: 'bg-blue-500',
        initials: 'FZ',
        avatar: '/fuzzProfile.svg',
        side: 'fuzz' as const
    }
} as const;

export type AgentId = keyof typeof AGENTS_INFO; 