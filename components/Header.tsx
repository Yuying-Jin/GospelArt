'use client'
export default function Header({ title, description }: {title:string, description:string}) {
    return (
        <header>
            <h1>{title}</h1>
            <div className="description">{description}</div>

            <style jsx>{`
                header {
                    text-align: center;
                    padding: 40px 20px 30px;
                    position: relative;
                }

                @media (min-width: 768px) {
                    header {
                        padding: 48px 40px 96px;
                    }
                }

                .description{
                    font-family: var(--font-heading);
                    color: var(--text-secondary);
                    font-size: 1rem;
                }

                @media (min-width: 768px) {
                    .description {
                        font-size: 1.1rem;
                    }
                }
            `}</style>
        </header>

    );
}