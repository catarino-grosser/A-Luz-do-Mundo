document.getElementById('checkout-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btnSubmit = document.getElementById('btn-submit');
    btnSubmit.disabled = true;
    btnSubmit.innerText = 'Gerando código Pix...';

    const payload = {
        name: document.getElementById('name').value,
        lastname: document.getElementById('lastname').value,
        email: document.getElementById('email').value,
        cpf: document.getElementById('cpf').value
    };

    try {
        const response = await fetch('/.netlify/functions/gerar-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorRes = await response.json();
            throw new Error(errorRes.error || 'Erro ao gerar o Pix');
        }

        const data = await response.json();
        
        // Injetar os dados recebidos na tela de pagamento
        document.getElementById('qr-code-img').src = `data:image/png;base64,${data.qr_code_base64}`;
        document.getElementById('pix-copia-cola').value = data.qr_code;
        
        // Transicionar as telas
        document.getElementById('main-card').classList.add('hidden');
        document.getElementById('payment-card').classList.remove('hidden');

        // Configuração da funcionalidade Copia e Cola
        document.getElementById('btn-copy').onclick = () => {
            const input = document.getElementById('pix-copia-cola');
            input.select();
            input.setSelectionRange(0, 99999); // Suporte para dispositivos móveis
            navigator.clipboard.writeText(input.value);
            
            const btnCopy = document.getElementById('btn-copy');
            const originalText = btnCopy.innerText;
            btnCopy.innerText = 'Copiado!';
            setTimeout(() => btnCopy.innerText = originalText, 2000);
        };

        // Iniciar Polling (Verificação em segundo plano a cada 5 segundos)
        iniciarVerificacaoPagamento(data.payment_id);

    } catch (error) {
        alert(error.message || 'Ocorreu um erro ao processar o seu Pix. Verifique os dados e tente novamente.');
        btnSubmit.disabled = false;
        btnSubmit.innerText = 'Gerar Pix de R$ 1,00';
        console.error(error);
    }
});

function iniciarVerificacaoPagamento(paymentId) {
    const intervalId = setInterval(async () => {
        try {
            const response = await fetch(`/.netlify/functions/verificar-pagamento?id=${paymentId}`);
            if (!response.ok) return;

            const data = await response.json();

            if (data.status === 'approved') {
                clearInterval(intervalId);
                // Exibir tela de sucesso total
                document.getElementById('payment-card').classList.add('hidden');
                document.getElementById('success-card').classList.remove('hidden');
            } else if (data.status === 'cancelled' || data.status === 'rejected') {
                clearInterval(intervalId);
                alert('O tempo para pagamento expirou ou a transação foi recusada. Recarregue a página para tentar novamente.');
                window.location.reload();
            }
        } catch (error) {
            console.error('Erro na requisição de checagem:', error);
        }
    }, 5000);
}
