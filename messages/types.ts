export type TranslationTypes = {
    menu: {
        navigation: {
            title: string;
            items: {
                home: string;
                about: string;
                gallery: string;
                news: string;
                witness: string;
                contact: string;
            };
        };
        policy: {
            title: string;
            items: {
                privacy: string;
                terms: string;
            };
        };
    };
    footer: {
        subscribe: {
            title: string;
            placeholder: string;
            button: string;
            sending: string;
            invalid: string;
            close: string;
            result: Record<
                | 'pending'
                | 'alreadySubscribed'
                | 'alreadyPending'
                | 'rateLimited'
                | 'forgotten'
                | 'restricted'
                | 'failed',
                {title: string; body: string}
            >;
        };
        copyright: string;
    };
    public: {
        home: {
            title: string;
            description: string;
        };
        about: {
            title: string;
            description: string;
        };
        contact: {
            title: string;
            description: string;
        };
        gallery: {
            title: string;
            description: string;
            card: {
                date: string;
                bible_reference: string;
            };
            modal: {
                close: string;
                previous: string;
                next: string;
                share: string;
                share_copied: string;
                themes: string;
                bible_themes: string;
                spiritual_themes: string;
            };
            feed: {
                load_more: string;
                loading: string;
                end: string;
                error: string;
                retry: string;
            };
            /** Chrome around the collections; their names come from the CMS. */
            collections: {
                all: string;
                empty: string;
            };
        };
        news: {
            title: string;
            description: string;
        };
        witness: {
            title: string;
            description: string;
        };
        auth: {
            common: {
                form: {
                    email: string;
                    password: string;
                    confirm_password: string;
                };
                button: {
                    login: string;
                    signup: string;
                    logout: string;
                    submit: string;
                    reset_password: string;
                };
                link: {
                    forgot_password: string;
                    have_account: string;
                    no_account: string;
                };
            };
            login: {
                title: string;
                description: string;
            };
            signup: {
                title: string;
                description: string;
            };
            forget_password: {
                title: string;
                description: string;
            };
        };
    };
};
