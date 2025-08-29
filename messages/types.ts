export type Translations = {
    menu: {
        navigation: {
            title: string;
            items: {
                home: string;
                about: string;
                gallery: string;
                news: string;
                witness: string;
                feedback: string;
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
            success: string;
            error: string;
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
        feedback: {
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
