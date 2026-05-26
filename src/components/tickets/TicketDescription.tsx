import RichText from '@/components/shared/RichText';

interface TicketDescriptionProps {
  description?: string;
}

const TicketDescription = ({ description }: TicketDescriptionProps) => {
  if (!description) return null;

  return (
    <div className="mt-6 pt-6 border-t">
      <h3 className="text-sm font-semibold text-foreground mb-3">Содержание</h3>
      <RichText text={description} className="text-sm leading-relaxed text-foreground" />
    </div>
  );
};

export default TicketDescription;
