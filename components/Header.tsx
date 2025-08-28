'use client'
export default function Header({ title, description }: {title:string, description:string}) {
    return (
        <header>
            <h1>{title}</h1>
            <div className="description">{description}</div>

            <style jsx>{`
                header {
                    text-align: center;
                    padding: 20px 20px 60px;
                    position: relative;
                }
    
                .description{
                    color: var(--text-secondary);
                    font-size: 0.95em;
                }
            `}</style>
        </header>

    );
}